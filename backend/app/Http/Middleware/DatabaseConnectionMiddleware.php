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
            Log::error('Database connection failed', [
                'error' => $e->getMessage(),
                'url' => $request->url(),
                'method' => $request->method()
            ]);
            
            // Return a proper error response
            return response()->json([
                'ok' => false,
                'error' => 'Database connection failed',
                'message' => 'Service temporarily unavailable'
            ], 503);
        }
    }
}
