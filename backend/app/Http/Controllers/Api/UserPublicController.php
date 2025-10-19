<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserPublicResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserPublicController extends Controller
{
    // /api/users/{user}/public-profile
    public function show(User $user, Request $request): JsonResponse
    {
        $user->load(['profile', 'socialAccounts' => fn($q) => $q->orderBy('provider')]);
        return response()->json(new UserPublicResource($user), 200, [], JSON_UNESCAPED_UNICODE);
    }

    // /api/public-profile -> profilo "di default" (es. il tuo)
    public function me(Request $request): JsonResponse
    {
        // scegli come individuare il “tuo” utente:
        // 1) per email fissa
        $user = User::where('email', 'marziofarina@icloud.com')
            ->with(['profile', 'socialAccounts' => fn($q) => $q->orderBy('provider')])
            ->firstOrFail();

        // oppure 2) per ID da env:
        // $id = (int) (env('PUBLIC_USER_ID', 1));
        // $user = User::with(['profile','socialAccounts'=>fn($q)=>$q->orderBy('provider')])->findOrFail($id);

        return response()->json(new UserPublicResource($user), 200, [], JSON_UNESCAPED_UNICODE);
    }
}