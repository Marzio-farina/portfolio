<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenIsFresh
{
    // minuti inattività; imposta quello che vuoi (es. 15)
    private int $maxIdleMinutes = 15;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || !$user->currentAccessToken()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $token = $user->currentAccessToken();
        $lastUsed = $token->last_used_at ?? $token->created_at;

        if (now()->diffInMinutes($lastUsed) >= $this->maxIdleMinutes) {
            $token->delete(); // revoca
            return response()->json(['message' => 'Session expired (idle timeout)'], 401);
        }

        return $next($request);
    }
}