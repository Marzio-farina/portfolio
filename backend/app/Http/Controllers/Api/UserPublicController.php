<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserPublicResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class UserPublicController extends Controller
{
    /**
     * GET /api/public-profile
     * Profilo pubblico “di default” (es. il tuo).
     * - Nessun uso di sessione
     * - Una sola query leggera + eager load mirato
     * - Micro-cache 60s per ridurre hit DB
     */
    public function me(Request $request): JsonResponse
    {
        $cacheKey = 'public_profile_v1'; // bump la versione se cambi struttura payload
        try {
            $data = Cache::remember($cacheKey, now()->addSeconds(60), function () use ($request) {
                // Individua l’utente pubblico da ENV o fallback all’email che stavi usando
                $publicEmail  = env('PUBLIC_USER_EMAIL', 'marziofarina@icloud.com');
                $publicUserId = (int) env('PUBLIC_USER_ID', 0);

                $query = User::query()->select(['id','name','surname','email','date_of_birth']);

                if ($publicUserId > 0) {
                    $query->where('id', $publicUserId);
                } else {
                    $query->where('email', $publicEmail);
                }

                // Eager load minimali e ordinati
                $user = $query
                ->with([
                           'profile:id,user_id,title,headline,bio,phone,location,location_url,avatar_url',
                    'icon:id,img,alt',
                    'socialAccounts' => fn($q) => $q
                        ->select(['id','user_id','provider','handle','url'])
                        ->orderBy('provider'),
                ])
                ->first();

                if (!$user) {
                    return null;
                }

                return (new UserPublicResource($user))->toArray($request);
            });
            if ($data === null) {
                // nessun utente “pubblico” trovato
                return response()->json(null, 404, [], JSON_UNESCAPED_UNICODE);
            }

            return response()->json($data, 200, [], JSON_UNESCAPED_UNICODE);

        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            // Serve stale se presente
            $stale = Cache::get($cacheKey);
            if ($stale) {
                return response()->json($stale, 200, ['X-Data-Status' => 'stale'], JSON_UNESCAPED_UNICODE);
            }
            if (stripos($msg, 'aborted') !== false || stripos($msg, 'client') !== false) {
                return response()->json(null, 204);
            }
            Log::warning('GET /api/public-profile failed', ['class'=>get_class($e),'msg'=>$msg]);
            return response()->json(['error' => 'Internal error'], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/users/slug/{slug}/public-profile
     * Profilo pubblico risolto da slug univoco nome-cognome[-n]
     */
    public function showBySlug(Request $request, string $slug): JsonResponse
    {
        $user = User::query()->select(['id','name','surname','email','date_of_birth','slug'])
            ->where('slug', $slug)
            ->with([
                           'profile:id,user_id,title,headline,bio,phone,location,location_url,avatar_url',
                'icon:id,img,alt',
                'socialAccounts' => fn($q) => $q
                    ->select(['id','user_id','provider','handle','url'])
                    ->orderBy('provider'),
            ])
            ->first();

        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Utente non trovato'], 404);
        }

        $data = (new UserPublicResource($user))->toArray($request);
        return response()->json($data, 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * GET /api/users/{user}/public-profile
     * Versione per utente specifico (route model binding).
     * Micro-cache per-ID (60s) e campi pubblici coerenti con /public-profile.
     */
    public function show(User $user, Request $request): JsonResponse
    {
        $cacheKey = 'public_profile_user_'.$user->id.'_v1';
        try {
            $data = Cache::remember($cacheKey, now()->addSeconds(60), function () use ($user, $request) {
                $user->load([
                    'profile:id,user_id,title,headline,bio,phone,location,avatar_url',
                    'icon:id,img,alt',
                    'socialAccounts' => fn($q) => $q->select(['id','user_id','provider','handle','url'])->orderBy('provider'),
                ]);

                return (new UserPublicResource($user))->toArray($request);
            });

            return response()->json($data, 200, [], JSON_UNESCAPED_UNICODE);

        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $stale = Cache::get($cacheKey);
            if ($stale) {
                return response()->json($stale, 200, ['X-Data-Status' => 'stale'], JSON_UNESCAPED_UNICODE);
            }
            if (stripos($msg, 'aborted') !== false || stripos($msg, 'client') !== false) {
                return response()->json(null, 204);
            }
            Log::warning('GET /api/users/{user}/public-profile failed', [
                'class'=>get_class($e),'msg'=>$msg,'user'=>$user->id ?? null
            ]);
            return response()->json(['error'=>'Internal error'], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
}