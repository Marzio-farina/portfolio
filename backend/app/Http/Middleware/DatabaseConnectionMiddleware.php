<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class DatabaseConnectionMiddleware
{
    /**
     * Handle an incoming request.
     * Ensures database connection is healthy before processing requests.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Test database connection with a simple query
            DB::connection()->getPdo();
            
            // If we get here, connection is healthy
            return $next($request);
            
        } catch (\Exception $e) {
            $message = $e->getMessage();

            // Gestione specifica Postgres: "prepared statement does not exist" (SQLSTATE 26000)
            $isPgsqlPreparedStmtError = str_contains($message, 'prepared statement') || str_contains($message, '26000');

            if ($isPgsqlPreparedStmtError) {
                try {
                    // Forza purge + reconnect e riprova una volta
                    DB::purge();
                    DB::reconnect();
                    DB::connection()->getPdo();
                    return $next($request);
                } catch (\Exception $e2) {
                    Log::error('Database reconnect failed after prepared statement error', [
                        'error' => $e2->getMessage(),
                        'url' => $request->url(),
                        'method' => $request->method()
                    ]);
                }
            }

            Log::error('Database connection failed', [
                'error' => $message,
                'url' => $request->url(),
                'method' => $request->method()
            ]);

            return response()->json([
                'ok' => false,
                'error' => 'Database connection failed',
                'message' => 'Service temporarily unavailable'
            ], 503);
        }
    }
}
