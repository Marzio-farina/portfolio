<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TestimonialResource;
use App\Models\Testimonial;
use App\Models\Icon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;

/**
 * Testimonial API Controller
 * 
 * Handles testimonial-related API endpoints for the portfolio.
 * Provides paginated testimonial listings with user information.
 */
class TestimonialController extends Controller
{
    /**
     * Get paginated list of testimonials
     * 
     * Returns a paginated collection of testimonials with their associated
     * user information. Supports custom pagination parameters.
     * 
     * @param Request $request HTTP request with optional pagination parameters
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection Paginated testimonial collection
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 12);

        $query = Testimonial::query()
            ->with(['user:id,name,surname', 'icon:id,img,alt'])
            ->orderByDesc('id');

        // se vuoi la paginazione
        $paginator = $query->paginate($perPage);

        return TestimonialResource::collection($paginator)
            ->additional([
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page'     => $paginator->perPage(),
                    'total'        => $paginator->total(),
                    'last_page'    => $paginator->lastPage(),
                ],
            ]);
    }

    /**
     * Create a new testimonial from a visitor
     * 
     * Accepts testimonial data from non-registered visitors,
     * automatically captures IP address and User-Agent for future matching.
     * 
     * @param Request $request HTTP request with testimonial data
     * @return JsonResponse Created testimonial resource or validation errors
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'author_name' => 'required|string|max:100',
            'author_surname' => 'nullable|string|max:100',
            'avatar_url' => 'nullable|url|max:500',
            'icon_id' => 'nullable|integer|exists:icons,id', // Nuovo campo per icona
            'avatar_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048', // Upload file locale
            'text' => 'required|string|min:10|max:1000',
            'role_company' => 'nullable|string|max:150',
            'company' => 'nullable|string|max:150',
            'rating' => 'required|integer|min:1|max:5',
        ]);

        // Normalizza stringhe vuote in null per i campi nullable
        $nullableFields = ['author_surname', 'avatar_url', 'icon_id', 'role_company', 'company'];
        foreach ($nullableFields as $field) {
            if (isset($validated[$field]) && $validated[$field] === '') {
                $validated[$field] = null;
            }
        }

        // Gestione dell'icona: priorità icon_id > avatar_file > avatar_url
        $iconId = null;
        if (!empty($validated['icon_id'])) {
            // Usa l'icona specificata
            $iconId = $validated['icon_id'];
        } elseif ($request->hasFile('avatar_file')) {
            // Gestisce upload file locale / cloud
            $iconId = $this->handleAvatarUpload($request->file('avatar_file'), $validated['author_name']);
            if ($iconId === null) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Caricamento avatar non riuscito. Verifica connessione e riprova.',
                ], 422, [], JSON_UNESCAPED_UNICODE);
            }
        } elseif (!empty($validated['avatar_url'])) {
            // Cerca se esiste già un'icona con questa URL
            $existingIcon = Icon::where('img', $validated['avatar_url'])->first();
            
            if ($existingIcon) {
                $iconId = $existingIcon->id;
            } else {
                // Crea una nuova icona per il visitatore
                $newIcon = Icon::create([
                    'img' => $validated['avatar_url'],
                    'alt' => $validated['author_name'] ?? 'Avatar visitatore',
                    'type' => 'user_uploaded'
                ]);
                $iconId = $newIcon->id;
            }
        }

        // Cattura automatica IP e User-Agent
        $testimonial = Testimonial::create([
            'author_name' => $validated['author_name'],
            'author_surname' => $validated['author_surname'] ?? null,
            'icon_id' => $iconId,
            'avatar_url' => $validated['avatar_url'] ?? null, // Mantenuto per compatibilità
            'text' => $validated['text'],
            'role_company' => $validated['role_company'] ?? null,
            'company' => $validated['company'] ?? null,
            'rating' => $validated['rating'],
            'user_id' => null, // Visitatori non hanno user_id
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(
            new TestimonialResource($testimonial),
            201
        );
    }

    /**
     * Get available icons for testimonials
     * 
     * Returns a list of available icons that can be used for testimonials
     * 
     * @return JsonResponse List of available icons
     */
    public function getIcons(): JsonResponse
    {
        $icons = Icon::select('id', 'img', 'alt')
            ->whereNotNull('img')
            ->orderBy('id')
            ->get()
            ->map(function ($icon) {
                return [
                    'id' => $icon->id,
                    'img' => $icon->img ? $this->getAbsoluteUrl($icon->img) : null,
                    'alt' => $icon->alt
                ];
            })
            ->filter(fn($icon) => $icon['img'] !== null);

        return response()->json([
            'icons' => $icons->values()
        ], 200);
    }

    /**
     * Get default avatars for testimonial creation
     * 
     * Returns only default avatars that can be selected when creating testimonials
     * 
     * @return JsonResponse List of default avatars
     */
    public function getDefaultAvatars(): JsonResponse
    {
        $icons = Icon::select('id', 'img', 'alt')
            ->where('type', 'default')
            ->whereNotNull('img')
            ->orderBy('id')
            ->get()
            ->map(function ($icon) {
                return [
                    'id' => $icon->id,
                    'img' => $icon->img ? $this->getAbsoluteUrl($icon->img) : null,
                    'alt' => $icon->alt
                ];
            })
            ->filter(fn($icon) => $icon['img'] !== null);

        return response()->json([
            'avatars' => $icons->values()
        ], 200);
    }

    /**
     * Convert relative path to absolute URL
     * 
     * Database path: storage/avatars/avatar-1.png
     * API returns: /storage/avatars/avatar-1.png
     * Production URL: https://api.marziofarina.it/storage/avatars/avatar-1.png
     * 
     * @param string|null $path
     * @return string|null
     */
    private function getAbsoluteUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }
        
        // Se è già un URL assoluto, restituiscilo così com'è
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        
        try {
            // Costruisci l'URL base dalla richiesta corrente
            $request = request();
            $scheme = $request->header('x-forwarded-proto', $request->getScheme());
            $host = $request->getHttpHost();
            $baseUrl = rtrim($scheme . '://' . $host, '/');
            
            // Ritorna il path così com'è nel database (/storage/avatars/...)
            $cleanPath = ltrim($path, '/');
            
            return $baseUrl . '/' . $cleanPath;
        } catch (\Exception $e) {
            // Fallback: usa APP_URL da .env
            $appUrl = env('APP_URL', 'https://api.marziofarina.it');
            $cleanPath = ltrim($path, '/');
            return rtrim($appUrl, '/') . '/' . $cleanPath;
        }
    }

    /**
     * Handle avatar file upload for testimonial
     * 
     * Processes uploaded avatar file, stores it, and creates icon record.
     * 
     * @param \Illuminate\Http\UploadedFile $file Uploaded file
     * @param string $authorName Author name for alt text
     * @return int|null Created icon ID or null on failure
     */
    private function handleAvatarUpload($file, string $authorName): ?int
    {
        try {
            // Genera nome file unico
            $extension = $file->getClientOriginalExtension();
            $filename = 'testimonial_avatar_' . Str::uuid() . '.' . $extension;
            $relativePath = 'avatars/' . $filename;

            if (app()->environment('production')) {
                // PRODUZIONE: salva su S3 (Supabase) dopo ottimizzazione in memoria
                $image = Image::make($file->getRealPath());
                $image->resize(150, 150, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });
                $binary = (string) $image->encode($extension, 85);
                Storage::disk('src')->put($relativePath, $binary);

                $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                $publicUrl = $baseUrl . '/' . $relativePath; // assoluto

                $icon = Icon::create([
                    'img' => $publicUrl,
                    'alt' => $authorName . ' - Avatar',
                    'type' => 'user_uploaded'
                ]);
            } else {
                // LOCALE: salva su disco pubblico
                $storedPath = $file->storeAs('avatars', $filename, 'public');
                $this->optimizeAvatarImage($storedPath);
                $icon = Icon::create([
                    'img' => 'storage/' . ltrim($storedPath, '/'),
                    'alt' => $authorName . ' - Avatar',
                    'type' => 'user_uploaded'
                ]);
            }
            
            return $icon->id;
            
        } catch (\Exception $e) {
            // Se c'è un errore, rimuovi il file caricato
            if (isset($relativePath)) {
                try {
                    if (app()->environment('production')) {
                        Storage::disk('src')->delete($relativePath);
                    } else if (isset($storedPath) && Storage::disk('public')->exists($storedPath)) {
                        Storage::disk('public')->delete($storedPath);
                    }
                } catch (\Throwable $cleanupError) {
                    // best-effort
                }
            }
            
            Log::error('Avatar upload failed in testimonial', [
                'error' => $e->getMessage(),
                'author' => $authorName,
                'env' => app()->environment(),
                'has_src_url' => (bool) (config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL')),
                'has_endpoint' => (bool) env('SUPABASE_S3_ENDPOINT'),
                'has_bucket' => (bool) env('SUPABASE_S3_BUCKET'),
            ]);
            
            return null;
        }
    }

    /**
     * Optimize avatar image
     * 
     * @param string $path Path to the stored image
     * @return void
     */
    private function optimizeAvatarImage(string $path): void
    {
        try {
            $fullPath = Storage::disk('public')->path($path);
            
            // Carica l'immagine con Intervention Image
            $image = Image::make($fullPath);
            
            // Ridimensiona mantenendo le proporzioni (max 150x150 per testimonials)
            $image->resize(150, 150, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize();
            });
            
            // Salva ottimizzata
            $image->save($fullPath, 85);
            
        } catch (\Exception $e) {
            Log::warning('Avatar optimization failed', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
        }
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