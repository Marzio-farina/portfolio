<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Category;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Project API Controller
 * 
 * Handles project-related API endpoints for the portfolio.
 * Provides paginated project listings with category and technology relationships.
 */
class ProjectController extends Controller
{
    /**
     * Get paginated list of projects
     * 
     * Returns a paginated collection of projects with their associated
     * categories and technologies. Supports custom pagination parameters.
     * 
     * @param Request $request HTTP request with optional pagination parameters
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection Paginated project collection
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 12);
        $perPage = max(1, min($perPage, 100));

        $query = Project::query()
            ->with([
                'category:id,title',            // adatta i campi esistenti
                'technologies:id,title,description'    // adatta i campi esistenti
            ])
            ->orderByDesc('id');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        // Execute paginated query
        $paginator = $query->paginate($perPage);

        // Return paginated resource collection
        return ProjectResource::collection($paginator)->additional([
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/projects
     * Crea un nuovo progetto.
     */
    public function store(Request $request): JsonResponse
    {
        // Log alternativo per debugging
        $debugFile = storage_path('logs/project_debug.log');
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'user_id' => Auth::id(),
            'request_method' => $request->method(),
            'content_type' => $request->header('Content-Type'),
            'has_files' => $request->hasFile('poster_file') || $request->hasFile('video_file'),
            'all_input_keys' => array_keys($request->all()),
        ];
        file_put_contents($debugFile, "=== INIZIO CREAZIONE PROGETTO ===\n" . json_encode($logData, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);
        
        Log::info('=== INIZIO CREAZIONE PROGETTO ===', $logData);

        // Verifica autenticazione
        $user = Auth::user();
        if (!$user) {
            Log::warning('Creazione progetto: utente non autenticato');
            return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
        }

        Log::info('Utente autenticato', ['user_id' => $user->id, 'email' => $user->email]);

        // Log dati ricevuti PRIMA della validazione
        Log::info('Dati ricevuti PRIMA validazione', [
            'title' => $request->input('title'),
            'category_id' => $request->input('category_id'),
            'description' => $request->input('description'),
            'description_type' => gettype($request->input('description')),
            'description_is_null' => $request->input('description') === null,
            'has_poster_file' => $request->hasFile('poster_file'),
            'has_video_file' => $request->hasFile('video_file'),
        ]);

        try {
            $validated = $request->validate([
                'user_id' => 'nullable|integer|exists:users,id', // ID utente per progetti specifici per utente
                'title' => 'required|string|max:50',
                'category_id' => 'required|integer|exists:categories,id',
                'description' => 'required|string|max:1000', // Required perché il database non accetta NULL
                'poster_file' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB
                'video_file' => 'nullable|mimes:mp4,webm,ogg|max:51200', // 50MB
            ]);

            Log::info('Validazione completata con successo', [
                'validated_keys' => array_keys($validated),
                'title' => $validated['title'] ?? 'NON PRESENTE',
                'category_id' => $validated['category_id'] ?? 'NON PRESENTE',
                'description' => $validated['description'] ?? 'NON PRESENTE',
                'description_type' => isset($validated['description']) ? gettype($validated['description']) : 'NON PRESENTE',
                'description_is_null' => isset($validated['description']) ? ($validated['description'] === null) : 'NON PRESENTE',
                'description_length' => isset($validated['description']) ? strlen($validated['description']) : 'NON PRESENTE',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            $debugFile = storage_path('logs/project_debug.log');
            $errorData = [
                'errors' => $e->errors(),
                'message' => $e->getMessage(),
            ];
            file_put_contents($debugFile, "=== ERRORE VALIDAZIONE ===\n" . json_encode($errorData, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);
            
            Log::error('Errore validazione', $errorData);
            throw $e; // Rilancia per la gestione standard di Laravel
        } catch (\Exception $validationError) {
            // Cattura qualsiasi altro errore prima della validazione
            $debugFile = storage_path('logs/project_debug.log');
            $errorData = [
                'error_message' => $validationError->getMessage(),
                'error_class' => get_class($validationError),
                'error_file' => $validationError->getFile(),
                'error_line' => $validationError->getLine(),
                'trace' => $validationError->getTraceAsString(),
            ];
            file_put_contents($debugFile, "=== ERRORE PRIMA DELLA VALIDAZIONE ===\n" . json_encode($errorData, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);
            
            Log::error('Errore prima della validazione', $errorData);
            throw $validationError;
        }

        try {
            // Prepara i dati base del progetto
            // Il mutator setDescriptionAttribute garantisce che description non sia mai null
            $descriptionRaw = $validated['description'] ?? '';
            $descriptionTrimmed = trim($descriptionRaw);
            
            Log::info('Preparazione description', [
                'description_raw' => $descriptionRaw,
                'description_raw_type' => gettype($descriptionRaw),
                'description_trimmed' => $descriptionTrimmed,
                'description_trimmed_type' => gettype($descriptionTrimmed),
                'description_trimmed_length' => strlen($descriptionTrimmed),
            ]);

            // Se user_id è presente nel request, usa quello (progetto specifico per utente)
            // Altrimenti usa l'utente autenticato
            $targetUserId = $validated['user_id'] ?? $user->id;
            
            // Carica l'utente target per generare il nome della cartella
            $targetUser = User::find($targetUserId);
            if (!$targetUser) {
                Log::error('Utente target non trovato', ['user_id' => $targetUserId]);
                return response()->json([
                    'ok' => false,
                    'message' => 'Utente non valido.',
                ], 422, [], JSON_UNESCAPED_UNICODE);
            }

            $projectData = [
                'title' => trim($validated['title']),
                'category_id' => $validated['category_id'],
                'user_id' => $targetUserId, // Usa l'user_id dal request se presente, altrimenti l'utente autenticato
                'description' => $descriptionTrimmed // Il mutator converte null/empty in ''
            ];

            Log::info('projectData preparato', [
                'project_data' => $projectData,
                'target_user_id' => $targetUserId,
                'target_user_email' => $targetUser->email,
                'request_user_id' => $validated['user_id'] ?? 'NON PRESENTE (usa autenticato)',
                'authenticated_user_id' => $user->id,
                'description_in_array' => $projectData['description'],
                'description_in_array_type' => gettype($projectData['description']),
                'description_in_array_is_null' => $projectData['description'] === null,
            ]);

            // Prepara la struttura cartelle: project/{id_utente}{nome_utente}/{nome_project}
            // Usa l'utente target (non sempre l'utente autenticato)
            $userFolder = $this->generateUserFolderName($targetUser);
            $projectFolder = $this->slugifyProjectName($validated['title']);
            $baseFolder = "project/{$userFolder}/{$projectFolder}";

            // Gestione poster file (OBBLIGATORIO)
            $posterFile = $request->file('poster_file');
            Log::info('Gestione poster file', [
                'poster_file_exists' => $posterFile !== null,
                'poster_file_size' => $posterFile ? $posterFile->getSize() : 'N/A',
                'poster_file_extension' => $posterFile ? $posterFile->getClientOriginalExtension() : 'N/A',
                'base_folder' => $baseFolder,
            ]);

            $extension = $posterFile->getClientOriginalExtension();
            $filename = 'poster.' . $extension;
            $relativePath = "{$baseFolder}/{$filename}";

            // Verifica se siamo in produzione o se abbiamo configurato Supabase
            $isProduction = app()->environment('production');
            $hasSupabaseConfig = !empty(config('filesystems.disks.src.key')) && 
                                !empty(config('filesystems.disks.src.secret')) &&
                                !empty(config('filesystems.disks.src.endpoint'));
            
            Log::info('Controllo ambiente per salvataggio poster', [
                'is_production' => $isProduction,
                'app_env' => app()->environment(),
                'has_supabase_config' => $hasSupabaseConfig,
                'should_use_supabase' => $isProduction || $hasSupabaseConfig,
            ]);

            if ($isProduction || $hasSupabaseConfig) {
                Log::info('Salvataggio poster su SUPABASE', [
                    'relative_path' => $relativePath,
                    'base_folder' => $baseFolder,
                    'disk_config' => [
                        'driver' => config('filesystems.disks.src.driver'),
                        'bucket' => config('filesystems.disks.src.bucket'),
                        'endpoint' => config('filesystems.disks.src.endpoint'),
                        'has_key' => !empty(config('filesystems.disks.src.key')),
                        'has_secret' => !empty(config('filesystems.disks.src.secret')),
                        'region' => config('filesystems.disks.src.region'),
                    ]
                ]);
                
                try {
                    // PRODUZIONE: salva su Supabase
                    $binary = file_get_contents($posterFile->getRealPath());
                    $binarySize = strlen($binary);
                    Log::info('Binary caricato', ['size' => $binarySize]);
                    
                    // Prova a salvare il file
                    $ok = Storage::disk('src')->put($relativePath, $binary);
                    
                    if (!$ok) {
                        Log::error('Errore salvataggio poster su Supabase - put() ritorna false', [
                            'relative_path' => $relativePath,
                            'binary_size' => $binarySize,
                        ]);
                        throw new \RuntimeException('Failed writing poster to src disk - put() returned false');
                    }
                    
                    // Verifica che il file sia stato effettivamente salvato
                    $exists = Storage::disk('src')->exists($relativePath);
                    if (!$exists) {
                        Log::error('File non trovato dopo il salvataggio', [
                            'relative_path' => $relativePath,
                        ]);
                        throw new \RuntimeException('File not found after upload - verification failed');
                    }
                    
                    Log::info('Poster salvato e verificato su Supabase', [
                        'relative_path' => $relativePath,
                        'file_exists' => $exists,
                    ]);
                    
                    $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                    $projectData['poster'] = $baseUrl . '/' . $relativePath;
                    Log::info('Poster URL generato', ['poster_url' => $projectData['poster']]);
                    
                } catch (\Exception $e) {
                    Log::error('Eccezione durante salvataggio poster su Supabase', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'relative_path' => $relativePath,
                    ]);
                    throw $e;
                }
            } else {
                Log::info('Salvataggio poster in LOCALE', ['filename' => $filename, 'base_folder' => $baseFolder]);
                // LOCALE: salva su storage locale mantenendo la stessa struttura
                $localPath = "public/{$baseFolder}";
                $posterFile->storeAs($localPath, $filename);
                $projectData['poster'] = "storage/{$baseFolder}/{$filename}";
                Log::info('Poster salvato in locale', ['poster_path' => $projectData['poster']]);
            }

            // Gestione video file (OPZIONALE)
            if ($request->hasFile('video_file')) {
                Log::info('Gestione video file presente');
                $videoFile = $request->file('video_file');
                $extension = $videoFile->getClientOriginalExtension();
                $filename = 'video.' . $extension;
                $relativePath = "{$baseFolder}/{$filename}";

                // Verifica se siamo in produzione o se abbiamo configurato Supabase
                $isProduction = app()->environment('production');
                $hasSupabaseConfig = !empty(config('filesystems.disks.src.key')) && 
                                    !empty(config('filesystems.disks.src.secret')) &&
                                    !empty(config('filesystems.disks.src.endpoint'));
                
                if ($isProduction || $hasSupabaseConfig) {
                    Log::info('Salvataggio video su SUPABASE', [
                        'relative_path' => $relativePath,
                        'is_production' => $isProduction,
                        'has_supabase_config' => $hasSupabaseConfig,
                    ]);
                    
                    try {
                        // PRODUZIONE: salva su Supabase
                        $binary = file_get_contents($videoFile->getRealPath());
                        $binarySize = strlen($binary);
                        Log::info('Video binary caricato', ['size' => $binarySize]);
                        
                        $ok = Storage::disk('src')->put($relativePath, $binary);
                        if (!$ok) {
                            Log::error('Errore salvataggio video su Supabase - put() ritorna false', [
                                'relative_path' => $relativePath,
                                'binary_size' => $binarySize,
                            ]);
                            throw new \RuntimeException('Failed writing video to src disk - put() returned false');
                        }
                        
                        // Verifica che il file sia stato effettivamente salvato
                        $exists = Storage::disk('src')->exists($relativePath);
                        if (!$exists) {
                            Log::error('Video non trovato dopo il salvataggio', [
                                'relative_path' => $relativePath,
                            ]);
                            throw new \RuntimeException('Video file not found after upload - verification failed');
                        }
                        
                        Log::info('Video salvato e verificato su Supabase', [
                            'relative_path' => $relativePath,
                            'file_exists' => $exists,
                        ]);
                        
                        $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                        $projectData['video'] = $baseUrl . '/' . $relativePath;
                        
                    } catch (\Exception $e) {
                        Log::error('Eccezione durante salvataggio video su Supabase', [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                            'relative_path' => $relativePath,
                        ]);
                        throw $e;
                    }
                } else {
                    Log::info('Salvataggio video in LOCALE', ['filename' => $filename, 'base_folder' => $baseFolder]);
                    // LOCALE: salva su storage locale mantenendo la stessa struttura
                    $localPath = "public/{$baseFolder}";
                    $videoFile->storeAs($localPath, $filename);
                    $projectData['video'] = "storage/{$baseFolder}/{$filename}";
                }
            } else {
                Log::info('Nessun file video presente');
            }

            Log::info('projectData finale PRIMA di Project::create', [
                'project_data' => $projectData,
                'description_value' => $projectData['description'],
                'description_type' => gettype($projectData['description']),
                'description_is_null' => $projectData['description'] === null,
            ]);

            // Crea il progetto con tutti i dati insieme
            // Il mutator garantisce che description non sia mai null
            Log::info('Chiamata Project::create()');
            $project = Project::create($projectData);
            
            Log::info('Project::create() completato', [
                'project_id' => $project->id,
                'project_description' => $project->description,
                'project_description_type' => gettype($project->description),
                'project_description_is_null' => $project->description === null,
            ]);

            // Carica le relazioni per la risposta
            $project->load(['category:id,title', 'technologies:id,title,description']);

            Log::info('=== CREAZIONE PROGETTO COMPLETATA CON SUCCESSO ===', [
                'project_id' => $project->id,
                'title' => $project->title,
            ]);

            return response()->json([
                'ok' => true,
                'data' => new ProjectResource($project)
            ], 201, [], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            $errorData = [
                'user_id' => $user->id ?? 'N/A',
                'error_message' => $e->getMessage(),
                'error_class' => get_class($e),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'validated_data' => $validated ?? null,
            ];
            
            // Log alternativo
            $debugFile = storage_path('logs/project_debug.log');
            file_put_contents($debugFile, "=== ERRORE CREAZIONE PROGETTO ===\n" . json_encode($errorData, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);
            
            Log::error('=== ERRORE CREAZIONE PROGETTO ===', $errorData);

            return response()->json([
                'ok' => false,
                'message' => 'Errore durante la creazione del progetto. Riprova più tardi.',
                'debug' => app()->environment('local') ? [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : null
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * PUT /api/projects/{project}
     * Aggiorna un progetto esistente.
     */
    public function update(Request $request, Project $project): JsonResponse
    {
        // Verifica autenticazione
        $user = Auth::user();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
        }

        // Verifica autorizzazione: l'utente deve essere il proprietario o admin
        $userId = $user->id;
        $userEmail = $user->email;
        $isAdmin = $userEmail === env('PUBLIC_USER_EMAIL', 'marziofarina@icloud.com');
        $projectUserId = $project->user_id ?? null;

        $canUpdate = (
            $projectUserId === $userId || 
            ($projectUserId === null && $isAdmin) ||
            $isAdmin
        );

        if (!$canUpdate) {
            return response()->json([
                'ok' => false, 
                'message' => 'Non autorizzato'
            ], 403);
        }

        // Log della richiesta per debugging
        Log::info('Aggiornamento progetto richiesto', [
            'project_id' => $project->id,
            'user_id' => $user->id,
            'request_data' => $request->all()
        ]);

        try {
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:50',
                'category_id' => 'sometimes|required|integer|exists:categories,id',
                'description' => 'nullable|string|max:1000',
                'technology_ids' => 'sometimes|array',
                'technology_ids.*' => 'integer|exists:technologies,id',
            ]);
            
            Log::info('Validazione progetto completata', [
                'project_id' => $project->id,
                'validated_data' => $validated
            ]);
            // Verifica se ci sono modifiche da applicare
            $hasChanges = false;

            // Aggiorna solo i campi validati
            if (isset($validated['title'])) {
                if ($project->title !== $validated['title']) {
                    $project->title = $validated['title'];
                    $hasChanges = true;
                }
            }
            if (isset($validated['category_id'])) {
                if ($project->category_id != $validated['category_id']) {
                    $project->category_id = $validated['category_id'];
                    $hasChanges = true;
                }
            }
            if (isset($validated['description'])) {
                // Il mutator garantisce che description non sia mai null
                $newDescription = trim($validated['description'] ?? '');
                if ($project->description !== $newDescription) {
                    $project->description = $newDescription;
                    $hasChanges = true;
                }
            }

            // Salva solo se ci sono modifiche
            if ($hasChanges) {
                $project->save();
            }

            // Aggiorna le tecnologie se presenti nel request
            // Gestisci anche il caso di array vuoto (rimuove tutte le tecnologie)
            if (isset($validated['technology_ids'])) {
                // Carica le tecnologie attuali del progetto per il confronto
                $project->load('technologies:id');
                
                $technologyIds = is_array($validated['technology_ids']) 
                    ? array_filter($validated['technology_ids'], fn($id) => is_numeric($id)) // Filtra valori non numerici
                    : [];
                
                // Converti tutti gli ID in interi
                $technologyIds = array_map('intval', $technologyIds);
                $technologyIds = array_unique($technologyIds); // Rimuovi duplicati
                
                // Verifica che tutti gli ID esistano prima di sincronizzare
                if (!empty($technologyIds)) {
                    $existingTechIds = \App\Models\Technology::whereIn('id', $technologyIds)->pluck('id')->map(fn($id) => (int)$id)->toArray();
                    $missingIds = array_diff($technologyIds, $existingTechIds);
                    
                    if (!empty($missingIds)) {
                        Log::warning('Alcuni technology_ids non esistono nel database', [
                            'project_id' => $project->id,
                            'missing_ids' => $missingIds,
                            'requested_ids' => $technologyIds,
                            'existing_ids' => $existingTechIds
                        ]);
                        // Usa solo gli ID esistenti
                        $technologyIds = $existingTechIds;
                    }
                }
                
                // Ottieni gli ID attuali delle tecnologie del progetto
                $currentTechIds = $project->technologies->pluck('id')->map(fn($id) => (int)$id)->toArray();
                
                // Sincronizza solo se ci sono differenze
                if (count($currentTechIds) !== count($technologyIds) || 
                    !empty(array_diff($currentTechIds, $technologyIds)) || 
                    !empty(array_diff($technologyIds, $currentTechIds))) {
                    try {
                        $project->technologies()->sync($technologyIds);
                        $hasChanges = true;
                    } catch (\Exception $syncException) {
                        Log::error('Errore durante sync delle tecnologie', [
                            'project_id' => $project->id,
                            'technology_ids' => $technologyIds,
                            'error' => $syncException->getMessage(),
                            'trace' => $syncException->getTraceAsString()
                        ]);
                        throw $syncException; // Rilancia l'eccezione per essere gestita dal catch principale
                    }
                }
            }

            // Se non ci sono modifiche, ritorna comunque il progetto aggiornato
            // Carica le relazioni per la risposta
            $project->refresh(); // Assicura che i dati siano aggiornati dal database
            $project->load(['category:id,title', 'technologies:id,title,description']);

            return response()->json([
                'ok' => true,
                'data' => new ProjectResource($project),
                'message' => $hasChanges ? 'Progetto aggiornato con successo' : 'Nessuna modifica rilevata'
            ], 200, [], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            Log::error('Errore aggiornamento progetto', [
                'project_id' => $project->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
                'validated_data' => $validated ?? []
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Errore durante l\'aggiornamento del progetto. Riprova più tardi.'
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * DELETE /api/projects/{project}
     * Soft-delete (popola deleted_at) e ritorna 204.
     */
    public function destroy(Project $project): JsonResponse
    {
        // Verifica autenticazione
        $user = Auth::user();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
        }

        $userId = $user->id;
        $userEmail = $user->email;
        $isAdmin = $userEmail === env('PUBLIC_USER_EMAIL', 'marziofarina@icloud.com');
        
        // Debug: verifica se la colonna user_id esiste
        try {
            $projectUserId = $project->user_id;
        } catch (\Exception $e) {
            // Se la colonna non esiste, assumiamo che l'admin possa eliminare qualsiasi progetto
            Log::warning('Project user_id column may not exist', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'is_admin' => $isAdmin,
                'error' => $e->getMessage()
            ]);
            
            if ($isAdmin) {
                $project->delete();
                return response()->json(null, 204);
            }
            
            return response()->json([
                'ok' => false, 
                'message' => 'Non autorizzato - colonna user_id non trovata nel database'
            ], 403);
        }

        Log::info('Project delete attempt', [
            'project_id' => $project->id,
            'project_user_id' => $projectUserId,
            'authenticated_user_id' => $userId,
            'authenticated_user_email' => $userEmail,
            'is_admin' => $isAdmin
        ]);

        // Verifica proprietà del progetto:
        // - L'utente è il proprietario del progetto OPPURE
        // - Il progetto non ha user_id (null) e l'utente è l'admin OPPURE
        // - L'utente è l'admin (può eliminare qualsiasi progetto)
        $canDelete = (
            $projectUserId === $userId || 
            ($projectUserId === null && $isAdmin) ||
            $isAdmin  // L'admin può eliminare qualsiasi progetto
        );

        if (!$canDelete) {
            Log::warning('Project delete denied', [
                'project_id' => $project->id,
                'project_user_id' => $projectUserId,
                'authenticated_user_id' => $userId,
                'is_admin' => $isAdmin
            ]);
            return response()->json([
                'ok' => false, 
                'message' => 'Non autorizzato'
            ], 403);
        }

        $project->delete(); // SoftDeletes
        Log::info('Project deleted successfully', ['project_id' => $project->id]);
        return response()->json(null, 204);
    }

    /**
     * Validate and sanitize per_page parameter
     * 
     * Ensures per_page is within acceptable bounds to prevent
     * performance issues and abuse.
     * 
     * @param mixed $perPage Raw per_page parameter
     * @return int Sanitized per_page value (1-100)
     */
    private function validatePerPage($perPage): int
    {
        $perPage = (int) $perPage;
        return max(1, min($perPage, 100));
    }

    /**
     * Genera il nome della cartella utente: {id_utente}{nome_utente}
     * 
     * Esempio: 1marziofarina
     * 
     * @param \App\Models\User $user
     * @return string
     */
    private function generateUserFolderName($user): string
    {
        $username = $user->name ?? $user->email ?? 'user';
        // Rimuovi spazi e caratteri speciali, mantieni solo alfanumerici
        $username = preg_replace('/[^a-zA-Z0-9]/', '', $username);
        return $user->id . $username;
    }

    /**
     * Genera uno slug dal nome del progetto per la cartella
     * 
     * Esempio: "Mio Progetto" -> "mio-progetto"
     * 
     * @param string $projectName
     * @return string
     */
    private function slugifyProjectName(string $projectName): string
    {
        // Converte in minuscolo
        $slug = mb_strtolower($projectName, 'UTF-8');
        
        // Sostituisce spazi e caratteri speciali con trattini
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        
        // Rimuove trattini multipli
        $slug = preg_replace('/-+/', '-', $slug);
        
        // Rimuove trattini iniziali/finali
        $slug = trim($slug, '-');
        
        // Limita la lunghezza (max 50 caratteri)
        $slug = mb_substr($slug, 0, 50);
        
        // Se vuoto, usa un fallback
        if (empty($slug)) {
            $slug = 'project-' . time();
        }
        
        return $slug;
    }
}