<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Category;
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
        // Verifica autenticazione
        $user = Auth::user();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:50',
            'category_id' => 'required|integer|exists:categories,id',
            'description' => 'nullable|string|max:1000',
            'poster_file' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB
            'video_file' => 'nullable|mimes:mp4,webm,ogg|max:51200', // 50MB
        ]);

        try {
            $project = new Project();
            $project->title = $validated['title'];
            $project->category_id = $validated['category_id'];
            $project->description = $validated['description'] ?? '';
            $project->user_id = $user->id;

            // Gestione poster file
            if ($request->hasFile('poster_file')) {
                $posterFile = $request->file('poster_file');
                $extension = $posterFile->getClientOriginalExtension();
                $filename = 'poster_' . Str::uuid() . '.' . $extension;
                $relativePath = 'projects/posters/' . $filename;

                if (app()->environment('production')) {
                    // PRODUZIONE: salva su Supabase
                    $binary = file_get_contents($posterFile->getRealPath());
                    $ok = Storage::disk('src')->put($relativePath, $binary);
                    if (!$ok) {
                        throw new \RuntimeException('Failed writing poster to src disk');
                    }
                    $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                    $project->poster = $baseUrl . '/' . $relativePath;
                } else {
                    // LOCALE: salva su storage locale
                    $posterFile->storeAs('public/projects/posters', $filename);
                    $project->poster = 'storage/projects/posters/' . $filename;
                }
            }

            // Gestione video file (opzionale)
            if ($request->hasFile('video_file')) {
                $videoFile = $request->file('video_file');
                $extension = $videoFile->getClientOriginalExtension();
                $filename = 'video_' . Str::uuid() . '.' . $extension;
                $relativePath = 'projects/videos/' . $filename;

                if (app()->environment('production')) {
                    // PRODUZIONE: salva su Supabase
                    $binary = file_get_contents($videoFile->getRealPath());
                    $ok = Storage::disk('src')->put($relativePath, $binary);
                    if (!$ok) {
                        throw new \RuntimeException('Failed writing video to src disk');
                    }
                    $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                    $project->video = $baseUrl . '/' . $relativePath;
                } else {
                    // LOCALE: salva su storage locale
                    $videoFile->storeAs('public/projects/videos', $filename);
                    $project->video = 'storage/projects/videos/' . $filename;
                }
            }

            $project->save();

            // Carica le relazioni per la risposta
            $project->load(['category:id,title', 'technologies:id,title,description']);

            return response()->json([
                'ok' => true,
                'data' => new ProjectResource($project)
            ], 201, [], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            Log::error('Errore creazione progetto', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Errore durante la creazione del progetto. Riprova più tardi.'
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

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:50',
            'category_id' => 'sometimes|required|integer|exists:categories,id',
            'description' => 'nullable|string|max:1000',
            'technology_ids' => 'sometimes|array',
            'technology_ids.*' => 'integer|exists:technologies,id',
        ]);

        try {
            // Aggiorna solo i campi validati
            if (isset($validated['title'])) {
                $project->title = $validated['title'];
            }
            if (isset($validated['category_id'])) {
                $project->category_id = $validated['category_id'];
            }
            if (isset($validated['description'])) {
                $project->description = $validated['description'] ?? '';
            }

            $project->save();

            // Aggiorna le tecnologie se presenti nel request
            if (isset($validated['technology_ids'])) {
                $project->technologies()->sync($validated['technology_ids']);
            }

            // Carica le relazioni per la risposta
            $project->load(['category:id,title', 'technologies:id,title,description']);

            return response()->json([
                'ok' => true,
                'data' => new ProjectResource($project)
            ], 200, [], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            Log::error('Errore aggiornamento progetto', [
                'project_id' => $project->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
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
}