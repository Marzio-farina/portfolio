<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SocialAccountResource;
use App\Models\SocialAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SocialAccountController extends Controller
{
    /**
     * Lista tutti i social accounts dell'utente autenticato
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            $socialAccounts = SocialAccount::where('user_id', $user->id)
                ->orderBy('provider')
                ->get();

            return response()->json(SocialAccountResource::collection($socialAccounts));
        } catch (\Throwable $e) {
            Log::error('[SocialAccountController] index error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'ok' => false,
                'error' => 'Error loading social accounts',
                'details' => app()->environment('local') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Crea o aggiorna un social account per l'utente autenticato
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function upsert(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'provider' => 'required|string|max:30',
                'handle' => 'nullable|string|max:100',
                'url' => 'nullable|url|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'ok' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();

            $socialAccount = SocialAccount::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'provider' => $request->input('provider'),
                ],
                [
                    'handle' => $request->input('handle'),
                    'url' => $request->input('url'),
                ]
            );

            Log::info('[SocialAccountController] upsert success', [
                'user_id' => $user->id,
                'provider' => $socialAccount->provider,
            ]);

            return response()->json(new SocialAccountResource($socialAccount));
        } catch (\Throwable $e) {
            Log::error('[SocialAccountController] upsert error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'ok' => false,
                'error' => 'Error saving social account',
                'details' => app()->environment('local') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Elimina un social account per provider
     *
     * @param string $provider
     * @return JsonResponse
     */
    public function delete(string $provider): JsonResponse
    {
        try {
            $user = Auth::user();

            $deleted = SocialAccount::where('user_id', $user->id)
                ->where('provider', $provider)
                ->delete();

            if ($deleted) {
                Log::info('[SocialAccountController] delete success', [
                    'user_id' => $user->id,
                    'provider' => $provider,
                ]);

                return response()->json([
                    'ok' => true,
                    'message' => 'Social account deleted successfully'
                ]);
            }

            return response()->json([
                'ok' => false,
                'error' => 'Social account not found'
            ], 404);
        } catch (\Throwable $e) {
            Log::error('[SocialAccountController] delete error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'ok' => false,
                'error' => 'Error deleting social account',
                'details' => app()->environment('local') ? $e->getMessage() : null
            ], 500);
        }
    }
}

