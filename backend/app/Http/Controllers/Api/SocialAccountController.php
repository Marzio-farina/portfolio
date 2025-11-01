<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

/**
 * Controller per la gestione dei social accounts
 */
class SocialAccountController extends Controller
{
    /**
     * Aggiorna o crea un social account per l'utente autenticato
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function upsert(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        
        if (!$user instanceof User) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validator = Validator::make($request->all(), [
            'provider' => 'required|string|max:30',
            'handle' => 'nullable|string|max:100',
            'url' => 'nullable|string|max:255|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        
        // Upsert: aggiorna se esiste, crea se non esiste
        $socialAccount = SocialAccount::updateOrCreate(
            [
                'user_id' => $user->id,
                'provider' => $data['provider']
            ],
            [
                'handle' => $data['handle'] ?? null,
                'url' => $data['url'] ?? null
            ]
        );

        // Invalida le chiavi cache usate dal profilo pubblico
        \Illuminate\Support\Facades\Cache::forget("public_profile_{$user->id}");
        \Illuminate\Support\Facades\Cache::forget("public_profile_slug_{$user->slug}");
        \Illuminate\Support\Facades\Cache::forget("public_profile_root");

        return response()->json([
            'provider' => $socialAccount->provider,
            'handle' => $socialAccount->handle,
            'url' => $socialAccount->url
        ]);
    }

    /**
     * Elimina un social account per l'utente autenticato
     * 
     * @param string $provider
     * @return JsonResponse
     */
    public function delete(string $provider): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        
        if (!$user instanceof User) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $deleted = SocialAccount::where('user_id', $user->id)
            ->where('provider', $provider)
            ->delete();

        if ($deleted) {
            return response()->json(['message' => 'Social account deleted']);
        }

        return response()->json(['message' => 'Social account not found'], 404);
    }
}

