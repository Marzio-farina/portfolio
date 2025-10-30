<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PDOException;
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
        $attempts = 0;
        $maxRetries = 0; // niente retry: fallisci velocemente con 503

        do {
            try {
                // Verifica connessione
                DB::connection()->getPdo();

                // Esegui la richiesta
                return $next($request);

            } catch (QueryException $e) {
                // Errore classico Postgres in ambienti serverless: prepared statement inesistente
                $code = $e->getCode();
                $message = $e->getMessage();
                $isPreparedStmtError = ($code === '26000') || str_contains($message, 'prepared statement');

                if ($isPreparedStmtError && $attempts < $maxRetries) {
                    Log::warning('DB prepared statement error, retry with reconnect', [
                        'code' => $code,
                        'error' => $message,
                        'url' => $request->url(),
                        'method' => $request->method(),
                        'attempt' => $attempts + 1,
                    ]);
                    DB::purge();
                    DB::reconnect();
                    $attempts++;
                    continue; // riprova
                }

                Log::error('Database query failed', [
                    'code' => $code,
                    'error' => $message,
                    'url' => $request->url(),
                    'method' => $request->method()
                ]);

                return response()->json([
                    'ok' => false,
                    'error' => 'Database query failed',
                    'message' => 'Service temporarily unavailable due to database error'
                ], 503);

            } catch (PDOException $e) {
                Log::error('Database connection failed (PDOException)', [
                    'error' => $e->getMessage(),
                    'url' => $request->url(),
                    'method' => $request->method()
                ]);

                return response()->json([
                    'ok' => false,
                    'error' => 'Database connection failed',
                    'message' => 'Service temporarily unavailable'
                ], 503);

            } catch (\Exception $e) {
                Log::error('Unexpected database error', [
                    'error' => $e->getMessage(),
                    'url' => $request->url(),
                    'method' => $request->method()
                ]);

                return response()->json([
                    'ok' => false,
                    'error' => 'Unexpected database error',
                    'message' => 'Service temporarily unavailable'
                ], 503);
            }
        } while ($attempts <= $maxRetries);

        // Fallback (non dovrebbe arrivarci)
        return response()->json([
            'ok' => false,
            'error' => 'Database error',
            'message' => 'Service temporarily unavailable'
        ], 503);
    }
}
