<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttestatoResource;
use App\Models\Attestato;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AttestatiController extends Controller
{
    /**
     * GET /api/attestati
     * Query:
     * - page (default 1)
     * - per_page (default 12, max 100)
     * - status=published|draft|all  (default published)
     * - featured=true|false         (se assente: nessun filtro)
     * - user_id=...
     * - search (match title/issuer, case-insensitive, portable)
     * - sort: issued_at_desc (default) | issued_at_asc | sort_order_desc | sort_order_asc
     */
    public function index(Request $request)
    {
        // Paginazione
        $perPage = (int) $request->query('per_page', 12);
        $perPage = max(1, min(100, $perPage));

        // Filtri base
        $status   = $request->query('status', 'published'); // published|draft|all
        $userId   = $request->query('user_id');

        // featured: NON usare Request::boolean() per avere "null" quando manca
        $featuredParam = $request->query('featured', null);
        $featured = null;
        if (!is_null($featuredParam)) {
            $val = strtolower((string)$featuredParam);
            $featured = in_array($val, ['1','true','yes','on'], true) ? true
                      : (in_array($val, ['0','false','no','off'], true) ? false : null);
        }

        $q = Attestato::query();

        if ($userId) {
            // Se user_id è specificato, mostra solo gli attestati di quell'utente
            $q->where('user_id', $userId);
        } else {
            // Se user_id NON è specificato, mostra solo gli attestati dell'utente principale (ID 1)
            // Questo garantisce che sul path senza slug si vedano solo gli attestati dell'utente principale
            $publicUserId = (int) (env('PUBLIC_USER_ID') ?? 1); // Default a 1 se non configurato
            $q->where('user_id', $publicUserId);
        }

        if ($status !== 'all') {
            $q->where('status', $status);
        }

        if (!is_null($featured)) {
            $q->where('is_featured', $featured);
        }

        // Ricerca case-insensitive e "portable" (MySQL/Postgres)
        if ($search = $request->query('search')) {
            $s = mb_strtolower($search);
            $q->where(function ($w) use ($s) {
                $w->whereRaw('LOWER(title)  LIKE ?', ["%{$s}%"])
                  ->orWhereRaw('LOWER(issuer) LIKE ?', ["%{$s}%"]);
            });
        }

        // Ordinamento
        $sort = $request->query('sort', 'issued_at_desc');
        match ($sort) {
            'issued_at_asc'   => $q->orderBy('issued_at', 'asc')->orderBy('id','desc'),
            'sort_order_asc'  => $q->orderBy('sort_order', 'asc')->orderBy('issued_at','desc'),
            'sort_order_desc' => $q->orderBy('sort_order', 'desc')->orderBy('issued_at','desc'),
            default           => $q->orderBy('issued_at', 'desc')->orderBy('id','desc'),
        };

        $paginator = $q->paginate($perPage)->appends($request->query());
        return AttestatoResource::collection($paginator);
    }

    /**
     * POST /api/attestati
     * Crea un nuovo attestato
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'nullable|integer|exists:users,id', // ID utente per attestati specifici per utente
            'title' => 'required|string|max:150',
            'description' => 'nullable|string|max:1000',
            'issuer' => 'nullable|string|max:150',
            'issued_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:issued_at',
            'credential_id' => 'nullable|string|max:100',
            'credential_url' => 'nullable|url|max:255',
            'poster_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // max 5MB
            'status' => 'nullable|string|in:draft,published',
            'is_featured' => 'nullable|boolean',
        ]);

        // Se user_id è presente nel request, usa quello (attestato specifico per utente)
        // Altrimenti usa l'utente autenticato o public fallback
        $targetUserId = $validated['user_id'] ?? Auth::id();
        
        if (!$targetUserId) {
            // Fallback a PUBLIC_USER_ID se configurato, altrimenti errore
            $publicUserId = env('PUBLIC_USER_ID');
            if (!$publicUserId) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Autenticazione richiesta per creare attestati',
                ], 401);
            }
            $targetUserId = (int) $publicUserId;
        }

        // Carica l'utente target per generare il nome della cartella
        $targetUser = User::find($targetUserId);
        if (!$targetUser) {
            return response()->json([
                'ok' => false,
                'message' => 'Utente non valido.',
            ], 422);
        }

        // Gestione upload poster con struttura organizzata per utente
        $posterPath = null;
        if ($request->hasFile('poster_file')) {
            $file = $request->file('poster_file');
            $extension = $file->getClientOriginalExtension();
            
            // Prepara la struttura cartelle: attestati/{id_utente}{nome_utente}/{slug_attestato}/
            $userFolder = $this->generateUserFolderName($targetUser);
            $attestatoFolder = $this->slugifyAttestatoTitle($validated['title']);
            $baseFolder = "attestati/{$userFolder}/{$attestatoFolder}";
            $filename = 'poster.' . $extension;
            $relativePath = "{$baseFolder}/{$filename}";

            $isProduction = app()->environment('production');
            $hasSupabaseConfig = !empty(config('filesystems.disks.src.key')) && 
                                !empty(config('filesystems.disks.src.secret')) &&
                                !empty(config('filesystems.disks.src.endpoint'));
            
            if ($isProduction || $hasSupabaseConfig) {
                // Salva su Supabase
                $binary = file_get_contents($file->getRealPath());
                $ok = Storage::disk('src')->put($relativePath, $binary);
                
                if (!$ok) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Errore durante il caricamento dell\'immagine',
                    ], 500);
                }

                // Verifica che il file sia stato salvato
                $exists = Storage::disk('src')->exists($relativePath);
                if (!$exists) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'File non trovato dopo il salvataggio',
                    ], 500);
                }

                $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                $posterPath = $baseUrl . '/' . $relativePath;
            } else {
                // Salva localmente sul disco 'public'.
                $localPath = "public/{$baseFolder}";
                $file->storeAs($localPath, $filename);
                $posterPath = "storage/{$baseFolder}/{$filename}";
            }
        }

        // Crea l'attestato
        $featuredBool = filter_var($validated['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $attestato = Attestato::create([
            'user_id' => $targetUserId, // Usa l'user_id dal request se presente, altrimenti l'utente autenticato/fallback
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'poster' => $posterPath,
            'issuer' => $validated['issuer'] ?? null,
            'issued_at' => $validated['issued_at'] ?? null,
            'expires_at' => $validated['expires_at'] ?? null,
            'credential_id' => $validated['credential_id'] ?? null,
            'credential_url' => $validated['credential_url'] ?? null,
            'status' => $validated['status'] ?? 'published',
            // forza literal boolean per Postgres
            'is_featured' => DB::raw($featuredBool ? 'TRUE' : 'FALSE'),
        ]);

        return response()->json(
            new AttestatoResource($attestato),
            201
        );
    }

    /**
     * PUT /api/attestati/{attestato}
     * Aggiorna un attestato esistente
     */
    public function update(Request $request, Attestato $attestato): JsonResponse
    {
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
        }

        // Verifica che l'utente sia il proprietario
        if ($attestato->user_id !== $userId) {
            return response()->json(['ok' => false, 'message' => 'Non autorizzato'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:150',
            'description' => 'nullable|string|max:1000',
            'issuer' => 'nullable|string|max:150',
            'issued_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'credential_id' => 'nullable|string|max:100',
            'credential_url' => 'nullable|string|url|max:255',
            'poster_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // Supporta upload poster nell'update
            'status' => 'nullable|string|in:draft,published',
            'is_featured' => 'nullable|boolean',
        ]);

        // Valida l'ordine delle date se entrambe sono presenti
        if (isset($validated['issued_at']) && isset($validated['expires_at'])) {
            if ($validated['issued_at'] && $validated['expires_at']) {
                $issued = new \DateTime($validated['issued_at']);
                $expires = new \DateTime($validated['expires_at']);
                if ($issued > $expires) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'La data di scadenza non può essere precedente alla data di rilascio',
                    ], 422);
                }
            }
        }

        // Gestione upload poster se presente nell'update
        if ($request->hasFile('poster_file')) {
            $file = $request->file('poster_file');
            $extension = $file->getClientOriginalExtension();
            
            // Carica l'utente per generare il nome della cartella
            $targetUser = User::find($attestato->user_id);
            if (!$targetUser) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Utente non valido.',
                ], 422);
            }
            
            // Usa il titolo attuale se non è stato modificato, altrimenti usa quello nuovo
            $attestatoTitle = array_key_exists('title', $validated) ? $validated['title'] : $attestato->title;
            
            // Prepara la struttura cartelle: attestati/{id_utente}{nome_utente}/{slug_attestato}/
            $userFolder = $this->generateUserFolderName($targetUser);
            $attestatoFolder = $this->slugifyAttestatoTitle($attestatoTitle);
            $baseFolder = "attestati/{$userFolder}/{$attestatoFolder}";
            $filename = 'poster.' . $extension;
            $relativePath = "{$baseFolder}/{$filename}";

            $isProduction = app()->environment('production');
            $hasSupabaseConfig = !empty(config('filesystems.disks.src.key')) && 
                                !empty(config('filesystems.disks.src.secret')) &&
                                !empty(config('filesystems.disks.src.endpoint'));
            
            if ($isProduction || $hasSupabaseConfig) {
                // Salva su Supabase
                $binary = file_get_contents($file->getRealPath());
                $ok = Storage::disk('src')->put($relativePath, $binary);
                
                if (!$ok) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Errore durante il caricamento dell\'immagine',
                    ], 500);
                }

                // Verifica che il file sia stato salvato
                $exists = Storage::disk('src')->exists($relativePath);
                if (!$exists) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'File non trovato dopo il salvataggio',
                    ], 500);
                }

                $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                $attestato->poster = $baseUrl . '/' . $relativePath;
            } else {
                // Salva localmente sul disco 'public'.
                $localPath = "public/{$baseFolder}";
                $file->storeAs($localPath, $filename);
                $attestato->poster = "storage/{$baseFolder}/{$filename}";
            }
        }

        // Aggiorna solo i campi validati
        if (array_key_exists('title', $validated)) $attestato->title = $validated['title'];
        if (array_key_exists('description', $validated)) $attestato->description = $validated['description'];
        if (array_key_exists('issuer', $validated)) $attestato->issuer = $validated['issuer'];
        if (array_key_exists('issued_at', $validated)) $attestato->issued_at = $validated['issued_at'];
        if (array_key_exists('expires_at', $validated)) $attestato->expires_at = $validated['expires_at'];
        if (array_key_exists('credential_id', $validated)) $attestato->credential_id = $validated['credential_id'];
        if (array_key_exists('credential_url', $validated)) $attestato->credential_url = $validated['credential_url'];
        if (array_key_exists('status', $validated)) $attestato->status = $validated['status'];
        if (array_key_exists('is_featured', $validated)) {
            $attestato->is_featured = filter_var($validated['is_featured'], FILTER_VALIDATE_BOOLEAN);
        }

        $attestato->save();

        return response()->json(
            new AttestatoResource($attestato)
        );
    }

    /**
     * DELETE /api/attestati/{attestato}
     * Soft-delete (popola deleted_at) e ritorna 204.
     * L'utente deve essere il proprietario dell'attestato o admin.
     */
    public function destroy(Attestato $attestato): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Non autenticato'], 401);
        }

        $userId = $user->id;
        $userEmail = $user->email;
        $attestatoUserId = $attestato->user_id;

        // Verifica se l'utente è admin (stesso controllo usato per i progetti)
        $isAdmin = $userEmail === env('PUBLIC_USER_EMAIL', 'marziofarina@icloud.com');

        // Autorizzazione:
        // - L'utente è il proprietario dell'attestato OPPURE
        // - L'utente è admin (può eliminare qualsiasi attestato)
        $isAuthorized = ($attestatoUserId === $userId) || $isAdmin;

        if (!$isAuthorized) {
            return response()->json([
                'ok' => false,
                'message' => 'Non autorizzato',
            ], 403);
        }

        $attestato->delete(); // SoftDeletes
        return response()->json(null, 204);
    }

    /**
     * Genera il nome della cartella utente: {id_utente}{nome_utente}
     * 
     * @param User $user
     * @return string
     */
    private function generateUserFolderName($user): string
    {
        $username = $user->name ?? $user->email ?? 'user';
        $username = preg_replace('/[^a-zA-Z0-9]/', '', $username);
        return $user->id . $username;
    }

    /**
     * Crea uno slug dal titolo dell'attestato
     * 
     * @param string $title
     * @return string
     */
    private function slugifyAttestatoTitle(string $title): string
    {
        $slug = mb_strtolower($title, 'UTF-8');
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = preg_replace('/-+/', '-', $slug);
        $slug = trim($slug, '-');
        $slug = mb_substr($slug, 0, 50);
        if (empty($slug)) {
            $slug = 'attestato-' . time();
        }
        return $slug;
    }
}