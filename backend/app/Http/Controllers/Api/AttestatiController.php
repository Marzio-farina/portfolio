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
            $q->where('user_id', $userId);
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

        // Determina user_id (autenticato o public fallback)
        $userId = Auth::id();
        if (!$userId) {
            // Fallback a PUBLIC_USER_ID se configurato, altrimenti errore
            $publicUserId = env('PUBLIC_USER_ID');
            if (!$publicUserId) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Autenticazione richiesta per creare attestati',
                ], 401);
            }
            $userId = (int) $publicUserId;
        }

        // Gestione upload poster
        $posterPath = null;
        if ($request->hasFile('poster_file')) {
            $file = $request->file('poster_file');
            $extension = $file->getClientOriginalExtension();
            $filename = Str::slug($validated['title']) . '-' . time() . '.' . $extension;
            
            if (app()->environment('production')) {
                // Salva su Supabase
                $relativePath = 'attestati/' . $filename;
                $binary = file_get_contents($file->getRealPath());
                $ok = Storage::disk('src')->put($relativePath, $binary);
                
                if (!$ok) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Errore durante il caricamento dell\'immagine',
                    ], 500);
                }

                $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                $posterPath = $baseUrl . '/' . ltrim($relativePath, '/');
            } else {
                // Salva localmente
                $storedPath = $file->storeAs('attestati', $filename, 'public');
                $posterPath = 'storage/' . ltrim($storedPath, '/');
            }
        }

        // Crea l'attestato
        $featuredBool = filter_var($validated['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $attestato = Attestato::create([
            'user_id' => $userId,
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
}