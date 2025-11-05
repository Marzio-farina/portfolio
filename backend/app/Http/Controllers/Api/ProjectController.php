<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Category;
use App\Models\User;
use App\Services\Factories\AuthorizationFactory;
use App\Services\Factories\FileUploadFactory;
use App\Services\Factories\FileUtilsFactory;
use App\Services\Factories\SlugFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

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
        try {
            // Log della richiesta
            $logData = [
                'timestamp' => date('Y-m-d H:i:s'),
                'user_id' => Auth::id(),
                'request_method' => $request->method(),
                'content_type' => $request->header('Content-Type'),
                'has_files' => $request->hasFile('poster_file') || $request->hasFile('video_file'),
                'all_input_keys' => array_keys($request->all()),
            ];
            
            Log::info('=== INIZIO CREAZIONE PROGETTO ===', $logData);

            // Verifica autenticazione
            $user = Auth::user();
            if (!$user) {
                Log::warning('Creazione progetto: utente non autenticato');
                return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
            }
        } catch (\Exception $earlyException) {
            Log::error('ERRORE CRITICO ALL\'INIZIO DI store()', [
                'error' => $earlyException->getMessage(),
                'file' => $earlyException->getFile(),
                'line' => $earlyException->getLine(),
                'trace' => $earlyException->getTraceAsString()
            ]);
            
            return response()->json([
                'ok' => false,
                'message' => 'Errore durante l\'inizializzazione: ' . $earlyException->getMessage()
            ], 500);
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
            $errorData = [
                'errors' => $e->errors(),
                'message' => $e->getMessage(),
            ];
            
            Log::error('Errore validazione', $errorData);
            throw $e; // Rilancia per la gestione standard di Laravel
        } catch (\Exception $validationError) {
            // Cattura qualsiasi altro errore prima della validazione
            $errorData = [
                'error_message' => $validationError->getMessage(),
                'error_class' => get_class($validationError),
                'error_file' => $validationError->getFile(),
                'error_line' => $validationError->getLine(),
                'trace' => $validationError->getTraceAsString(),
            ];
            
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

            // Genera path usando SlugFactory
            $baseFolder = SlugFactory::generateProjectPath($targetUser, $validated['title']);

            // Gestione poster file (OBBLIGATORIO)
            $posterFile = $request->file('poster_file');
            Log::info('Gestione poster file', [
                'poster_file_exists' => $posterFile !== null,
                'poster_file_size' => $posterFile ? $posterFile->getSize() : 'N/A',
                'poster_file_extension' => $posterFile ? $posterFile->getClientOriginalExtension() : 'N/A',
                'base_folder' => $baseFolder,
            ]);

            $filename = FileUploadFactory::generateFilename($posterFile, 'poster');
            $relativePath = FileUploadFactory::buildRelativePath($baseFolder, $filename);

            try {
                // Upload usando FileUploadFactory
                $projectData['poster'] = FileUploadFactory::upload($posterFile, $relativePath, 'poster progetto');
                Log::info('Poster URL generato', ['poster_url' => $projectData['poster']]);
            } catch (\RuntimeException $e) {
                Log::error('Errore upload poster progetto', [
                    'error' => $e->getMessage(),
                    'relative_path' => $relativePath,
                ]);
                throw $e;
            }

            // Gestione video file (OPZIONALE)
            if ($request->hasFile('video_file')) {
                Log::info('Gestione video file presente');
                $videoFile = $request->file('video_file');
                
                // Genera nome randomico usando FileUtilsFactory
                $extension = $videoFile->getClientOriginalExtension();
                $filename = FileUtilsFactory::generateRandomFilenameWithExtension($extension, 10);
                $relativePath = FileUploadFactory::buildRelativePath($baseFolder, $filename);
                
                try {
                    // Upload usando FileUploadFactory
                    $projectData['video'] = FileUploadFactory::upload($videoFile, $relativePath, 'video progetto');
                    Log::info('Video caricato con successo', ['video_url' => $projectData['video']]);
                } catch (\RuntimeException $e) {
                    Log::error('Errore upload video progetto', [
                        'error' => $e->getMessage(),
                        'relative_path' => $relativePath,
                    ]);
                    throw $e;
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

        // Verifica autorizzazione usando AuthorizationFactory
        if (!AuthorizationFactory::canUpdate($user, $project)) {
            AuthorizationFactory::logUnauthorizedAttempt($user, $project, 'update');
            return response()->json([
                'ok' => false, 
                'message' => 'Non autorizzato'
            ], 403);
        }

        // Log della richiesta per debugging
        $allFiles = $request->allFiles();
        $hasVideoFileInAll = isset($allFiles['video_file']);
        $hasVideoFileInRequest = $request->hasFile('video_file');
        
        Log::info('Aggiornamento progetto richiesto', [
            'project_id' => $project->id,
            'user_id' => $user->id,
            'has_poster_file' => $request->hasFile('poster_file'),
            'has_video_file' => $hasVideoFileInRequest,
            'has_video_file_in_allFiles' => $hasVideoFileInAll,
            'request_keys' => array_keys($request->all()),
            'allFiles_keys' => array_keys($allFiles),
            'request_method' => $request->method(),
            'content_type' => $request->header('Content-Type'),
            'content_length' => $request->header('Content-Length'),
            'files_present' => $request->hasFile('poster_file') || $hasVideoFileInRequest,
            'php_upload_max_filesize' => ini_get('upload_max_filesize'),
            'php_post_max_size' => ini_get('post_max_size'),
            'php_max_file_uploads' => ini_get('max_file_uploads'),
        ]);
        
        // Controlla se il file è stato rifiutato da PHP a causa di limiti
        $contentLength = $request->header('Content-Length');
        $uploadMaxSize = ini_get('upload_max_filesize');
        $postMaxSize = ini_get('post_max_size');
        
        // Converte i limiti PHP in bytes per confronto usando FileUtilsFactory
        $uploadMaxBytes = FileUtilsFactory::convertToBytes($uploadMaxSize);
        $postMaxBytes = FileUtilsFactory::convertToBytes($postMaxSize);
        
        if ($contentLength && (int)$contentLength > $postMaxBytes) {
            $errorMessage = "Il file è troppo grande. Limite PHP post_max_size: {$postMaxSize}. Dimensione richiesta: " . round((int)$contentLength / 1024 / 1024, 2) . "MB. Per aumentare il limite, modifica il file php.ini o usa un server web configurato.";
            Log::error('File troppo grande per post_max_size', [
                'content_length' => $contentLength,
                'content_length_mb' => round((int)$contentLength / 1024 / 1024, 2),
                'post_max_size' => $postMaxSize,
                'post_max_bytes' => $postMaxBytes,
            ]);
            return response()->json([
                'ok' => false,
                'message' => $errorMessage
            ], 413); // 413 Payload Too Large
        }
        
        if ($contentLength && (int)$contentLength > $uploadMaxBytes) {
            $errorMessage = "Il file è troppo grande. Limite PHP upload_max_filesize: {$uploadMaxSize}. Dimensione richiesta: " . round((int)$contentLength / 1024 / 1024, 2) . "MB. Per aumentare il limite, modifica il file php.ini o usa un server web configurato.";
            Log::error('File troppo grande per upload_max_filesize', [
                'content_length' => $contentLength,
                'content_length_mb' => round((int)$contentLength / 1024 / 1024, 2),
                'upload_max_filesize' => $uploadMaxSize,
                'upload_max_bytes' => $uploadMaxBytes,
            ]);
            return response()->json([
                'ok' => false,
                'message' => $errorMessage
            ], 413); // 413 Payload Too Large
        }
        
        // Log dettagliato se ci sono file
        if ($hasVideoFileInAll) {
            $videoFile = $request->file('video_file');
            if ($videoFile) {
                // Controlla se il file è valido prima di chiamare metodi che potrebbero fallire
                $isValid = $videoFile->isValid();
                $errorCode = $videoFile->getError();
                
                $logData = [
                    'is_valid' => $isValid,
                    'error_code' => $errorCode,
                ];
                
                // Aggiungi informazioni solo se il file è valido
                if ($isValid) {
                    try {
                        $logData['filename'] = $videoFile->getClientOriginalName();
                        $logData['size'] = $videoFile->getSize();
                        $logData['extension'] = $videoFile->getClientOriginalExtension();
                        $logData['mime_type'] = $videoFile->getMimeType();
                    } catch (\Exception $e) {
                        $logData['error_getting_details'] = $e->getMessage();
                    }
                } else {
                    $logData['error_message'] = $videoFile->getErrorMessage();
                }
                
                Log::info('Video file presente nella richiesta', $logData);
            } else {
                Log::warning('Video file presente in allFiles ma null quando si tenta di accedere', [
                    'allFiles_video_file' => $allFiles['video_file'] ?? 'NOT SET',
                ]);
            }
        } else {
            Log::warning('Video file NON presente nella richiesta', [
                'allFiles' => $allFiles,
                'request_all' => array_keys($request->all()),
            ]);
        }
        
        if ($request->hasFile('poster_file')) {
            $posterFile = $request->file('poster_file');
            Log::info('Poster file presente nella richiesta', [
                'filename' => $posterFile->getClientOriginalName(),
                'mime_type' => $posterFile->getMimeType(),
                'size' => $posterFile->getSize(),
                'extension' => $posterFile->getClientOriginalExtension(),
            ]);
        }

        try {
            // Controlla i file in diversi modi per capire il problema
            $hasVideoFile = $request->hasFile('video_file');
            $allFiles = $request->allFiles();
            $videoFileFromAllFiles = $allFiles['video_file'] ?? null;
            $videoFileFromRequest = $request->file('video_file');
            
            Log::info('Controllo file video PRIMA validazione', [
                'hasFile_video_file' => $hasVideoFile,
                'allFiles_has_video_file' => isset($allFiles['video_file']),
                'videoFileFromRequest_is_null' => $videoFileFromRequest === null,
                'videoFileFromAllFiles_is_null' => $videoFileFromAllFiles === null,
                'videoFileFromAllFiles_class' => $videoFileFromAllFiles ? get_class($videoFileFromAllFiles) : 'null',
            ]);
            
            // Prova a usare il file da allFiles se quello da hasFile non funziona
            $videoFile = null;
            if ($hasVideoFile && $videoFileFromRequest) {
                $videoFile = $videoFileFromRequest;
                Log::info('Usando videoFile da hasFile()');
            } elseif ($videoFileFromAllFiles) {
                $videoFile = $videoFileFromAllFiles;
                Log::info('Usando videoFile da allFiles() perché hasFile() ha fallito');
            }
            
            if ($videoFile) {
                // Controlla se il file è valido prima di accedere alle proprietà
                $isValid = $videoFile->isValid();
                $errorCode = $videoFile->getError();
                
                $logData = [
                    'is_valid' => $isValid,
                    'error_code' => $errorCode,
                ];
                
                if ($isValid) {
                    try {
                        $logData['filename'] = $videoFile->getClientOriginalName();
                        $logData['size'] = $videoFile->getSize();
                        $logData['extension'] = $videoFile->getClientOriginalExtension();
                        $logData['mime_type'] = $videoFile->getMimeType();
                    } catch (\Exception $e) {
                        $logData['error_getting_details'] = $e->getMessage();
                    }
                } else {
                    $logData['error_message'] = $videoFile->getErrorMessage();
                }
                
                Log::info('Video file presente PRIMA validazione', $logData);
            } else {
                Log::warning('Video file NON trovato in nessun modo', [
                    'request_all_keys' => array_keys($request->all()),
                    'allFiles_keys' => array_keys($allFiles),
                    'request_all' => $request->all(),
                ]);
            }
            
            // Valida i campi normali
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:50',
                'category_id' => 'sometimes|required|integer|exists:categories,id',
                'description' => 'nullable|string|max:1000',
                'technology_ids' => 'sometimes|array',
                'technology_ids.*' => 'integer|exists:technologies,id',
                'poster_file' => 'sometimes|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB
                'remove_video' => 'sometimes|string', // Per FormData, viene passato come stringa
            ]);
            
            // Valida il video file separatamente con gestione errore migliore
            // Usa il videoFile già recuperato prima se disponibile
            $videoFileForValidation = null;
            if ($videoFile && $videoFile->isValid()) {
                $videoFileForValidation = $videoFile;
            } elseif ($hasVideoFile && $request->hasFile('video_file')) {
                $videoFileForValidation = $request->file('video_file');
            } elseif (isset($allFiles['video_file'])) {
                $videoFileForValidation = $allFiles['video_file'];
            }
            
            if ($videoFileForValidation) {
                // Controlla se il file è valido prima di accedere alle proprietà
                if (!$videoFileForValidation->isValid()) {
                    $errorCode = $videoFileForValidation->getError();
                    $uploadMaxSize = ini_get('upload_max_filesize');
                    $postMaxSize = ini_get('post_max_size');
                    
                    $errorMessages = [
                        UPLOAD_ERR_INI_SIZE => "Il file supera il limite di upload di PHP (upload_max_filesize: {$uploadMaxSize}). Dimensione file richiesta: " . (isset($_SERVER['CONTENT_LENGTH']) ? round($_SERVER['CONTENT_LENGTH'] / 1024 / 1024, 2) . 'MB' : 'sconosciuta'),
                        UPLOAD_ERR_FORM_SIZE => "Il file supera il limite di upload del form (post_max_size: {$postMaxSize})",
                        UPLOAD_ERR_PARTIAL => 'Il file è stato caricato solo parzialmente',
                        UPLOAD_ERR_NO_FILE => 'Nessun file è stato caricato',
                        UPLOAD_ERR_NO_TMP_DIR => 'Directory temporanea mancante',
                        UPLOAD_ERR_CANT_WRITE => 'Impossibile scrivere il file su disco',
                        UPLOAD_ERR_EXTENSION => 'Un\'estensione PHP ha fermato il caricamento del file',
                    ];
                    $errorMessage = $errorMessages[$errorCode] ?? "Errore sconosciuto: $errorCode";
                    
                    $logData = [
                        'error_code' => $errorCode,
                        'error_message' => $errorMessage,
                        'php_upload_max_filesize' => $uploadMaxSize,
                        'php_post_max_size' => $postMaxSize,
                        'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'not set',
                    ];
                    
                    // Prova a ottenere il nome del file solo se possibile
                    try {
                        $logData['filename'] = $videoFileForValidation->getClientOriginalName();
                    } catch (\Exception $e) {
                        $logData['error_getting_filename'] = $e->getMessage();
                    }
                    
                    Log::error('Video file non valido', $logData);
                    throw new \RuntimeException($errorMessage);
                }
                
                // Valida dimensione e tipo manualmente
                $maxSize = 50 * 1024 * 1024; // 50MB in bytes
                $fileSize = $videoFileForValidation->getSize();
                if ($fileSize > $maxSize) {
                    throw new \RuntimeException('Il file video è troppo grande. Dimensione massima: 50MB. Dimensione file: ' . round($fileSize / 1024 / 1024, 2) . 'MB');
                }
                
                // Ottieni il MIME type in modo sicuro
                $mimeType = null;
                try {
                    $mimeType = $videoFileForValidation->getMimeType();
                } catch (\Exception $e) {
                    Log::warning('Impossibile ottenere MIME type del video, uso estensione', [
                        'error' => $e->getMessage(),
                    ]);
                    // Fallback: usa l'estensione per determinare il MIME type
                    $extension = strtolower($videoFileForValidation->getClientOriginalExtension());
                    $extensionToMime = [
                        'mp4' => 'video/mp4',
                        'webm' => 'video/webm',
                        'ogg' => 'video/ogg',
                    ];
                    $mimeType = $extensionToMime[$extension] ?? null;
                }
                
                if (!$mimeType) {
                    throw new \RuntimeException('Impossibile determinare il tipo del file video');
                }
                
                $allowedMimes = ['video/mp4', 'video/webm', 'video/ogg'];
                if (!in_array($mimeType, $allowedMimes)) {
                    throw new \RuntimeException('Formato video non supportato. Usa MP4, WEBM o OGG. Tipo rilevato: ' . $mimeType);
                }
                
                $validated['video_file'] = $videoFileForValidation; // Aggiungi al validated per usarlo dopo
            }
            
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

            // Gestione upload file se presenti
            $targetUser = $project->user_id 
                ? User::find($project->user_id) 
                : User::find(AuthorizationFactory::getPublicUserId());
            
            $baseFolder = SlugFactory::generateProjectPath($targetUser, $project->title);

            // Gestione poster file (se presente)
            if ($request->hasFile('poster_file')) {
                Log::info('Aggiornamento poster file');
                $posterFile = $request->file('poster_file');
                
                $filename = FileUploadFactory::generateFilename($posterFile, 'poster');
                $relativePath = FileUploadFactory::buildRelativePath($baseFolder, $filename);

                try {
                    $project->poster = FileUploadFactory::upload($posterFile, $relativePath, 'poster progetto update');
                    $hasChanges = true;
                } catch (\RuntimeException $e) {
                    Log::error('Errore salvataggio poster durante update', [
                        'error' => $e->getMessage(),
                        'relative_path' => $relativePath,
                    ]);
                    throw $e;
                }
            }

            // Gestione video file (se presente)
            // Usa il videoFile già recuperato durante la validazione se disponibile
            $videoFileForSave = null;
            if ($videoFile && $videoFile->isValid()) {
                $videoFileForSave = $videoFile;
            } elseif ($request->hasFile('video_file')) {
                $videoFileForSave = $request->file('video_file');
            } elseif (isset($allFiles['video_file'])) {
                $videoFileForSave = $allFiles['video_file'];
            }
            
            if ($videoFileForSave && $videoFileForSave->isValid()) {
                Log::info('=== INIZIO AGGIORNAMENTO VIDEO FILE ===', [
                    'project_id' => $project->id,
                    'base_folder' => $baseFolder,
                ]);
                
                $videoFile = $videoFileForSave;
                $extension = $videoFile->getClientOriginalExtension();
                
                // Genera nome randomico usando FileUtilsFactory
                $filename = FileUtilsFactory::generateRandomFilenameWithExtension($extension, 10);
                $relativePath = FileUploadFactory::buildRelativePath($baseFolder, $filename);
                
                Log::info('Dettagli video file', [
                    'original_name' => $videoFile->getClientOriginalName(),
                    'mime_type' => $videoFile->getMimeType(),
                    'size' => $videoFile->getSize(),
                    'extension' => $extension,
                    'filename' => $filename,
                    'relative_path' => $relativePath,
                ]);

                try {
                    // Upload usando FileUploadFactory
                    $project->video = FileUploadFactory::upload($videoFile, $relativePath, 'video progetto update');
                    $hasChanges = true;
                    
                    Log::info('Video URL generato e assegnato al progetto', [
                        'video_url' => $project->video,
                        'project_video_field' => $project->video,
                    ]);
                } catch (\RuntimeException $e) {
                    Log::error('Eccezione durante salvataggio video', [
                        'error' => $e->getMessage(),
                        'relative_path' => $relativePath,
                    ]);
                    throw $e;
                }
                
                Log::info('=== FINE AGGIORNAMENTO VIDEO FILE ===', [
                    'video_url' => $project->video,
                    'has_changes' => $hasChanges,
                ]);
            } else {
                Log::info('Nessun file video presente nella richiesta di update');
            }
            
            // Gestione rimozione video se richiesto
            $removeVideo = $request->input('remove_video');
            if ($removeVideo === 'true' || $removeVideo === true) {
                Log::info('Rimozione video richiesta', [
                    'project_id' => $project->id,
                    'current_video' => $project->video,
                    'remove_video_value' => $removeVideo,
                ]);
                $project->video = null;
                $hasChanges = true;
                Log::info('Video rimosso dal progetto');
            }

            // Salva le modifiche se ci sono file o altri campi aggiornati
            if ($hasChanges) {
                $project->save();
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

        // Verifica autorizzazione usando AuthorizationFactory
        if (!AuthorizationFactory::canDelete($user, $project)) {
            AuthorizationFactory::logUnauthorizedAttempt($user, $project, 'delete');
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
     * PATCH /api/projects/{id}/restore
     * Ripristina un progetto soft-deleted (imposta deleted_at a null)
     */
    public function restore(int $id): JsonResponse
    {
        // Verifica autenticazione
        $user = Auth::user();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
        }

        // Trova il progetto anche se soft-deleted
        $project = Project::withTrashed()->find($id);
        
        if (!$project) {
            return response()->json(['ok' => false, 'message' => 'Progetto non trovato'], 404);
        }

        // Verifica autorizzazione usando AuthorizationFactory
        if (!AuthorizationFactory::canUpdate($user, $project)) {
            AuthorizationFactory::logUnauthorizedAttempt($user, $project, 'restore');
            return response()->json([
                'ok' => false, 
                'message' => 'Non autorizzato'
            ], 403);
        }

        // Ripristina il progetto (imposta deleted_at a null)
        $project->restore();
        
        Log::info('Project restored successfully', ['project_id' => $id]);

        // Carica le relazioni per la risposta
        $project->load(['category:id,title', 'technologies:id,title,description']);

        return response()->json([
            'ok' => true,
            'data' => new ProjectResource($project)
        ], 200, [], JSON_UNESCAPED_UNICODE);
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
     * Aggiorna il layout della griglia per un progetto
     * 
     * @param Request $request
     * @param Project $project
     * @return JsonResponse
     */
    public function updateLayout(Request $request, Project $project): JsonResponse
    {
        // Verifica autenticazione
        $user = Auth::user();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
        }

        // Verifica autorizzazione usando AuthorizationFactory
        if (!AuthorizationFactory::canUpdate($user, $project)) {
            AuthorizationFactory::logUnauthorizedAttempt($user, $project, 'updateLayout');
            return response()->json([
                'ok' => false, 
                'message' => 'Non autorizzato'
            ], 403);
        }

        // Valida il layout_config
        $validated = $request->validate([
            'layout_config' => 'required|string'
        ]);

        // Aggiorna solo il layout_config
        $project->layout_config = $validated['layout_config'];
        $project->save();

        return response()->json([
            'ok' => true,
            'message' => 'Layout aggiornato con successo',
            'data' => new ProjectResource($project)
        ]);
    }
}