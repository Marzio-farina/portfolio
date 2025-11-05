<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Health Check Controller
 * 
 * Endpoint per verificare lo stato di salute dell'applicazione
 * Utile per monitoring, load balancers, e deployment automation
 */
class HealthCheckController extends Controller
{
    /**
     * Health check completo
     * Verifica database, cache, storage e altri servizi
     * 
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $startTime = microtime(true);
        
        $checks = [
            'app' => $this->checkApp(),
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'storage' => $this->checkStorage(),
        ];

        // Determina stato generale
        $allHealthy = collect($checks)->every(fn($check) => $check['status'] === 'healthy');
        $hasWarnings = collect($checks)->contains(fn($check) => $check['status'] === 'degraded');
        
        $overallStatus = $allHealthy ? 'healthy' : ($hasWarnings ? 'degraded' : 'unhealthy');
        $statusCode = $overallStatus === 'healthy' ? 200 : 503;

        // Calcola tempo di risposta
        $responseTime = round((microtime(true) - $startTime) * 1000, 2);

        return response()->json([
            'status' => $overallStatus,
            'timestamp' => now()->toIso8601String(),
            'environment' => app()->environment(),
            'version' => config('app.version', '1.0.0'),
            'response_time_ms' => $responseTime,
            'checks' => $checks,
        ], $statusCode);
    }

    /**
     * Health check semplice (solo status code)
     * Più veloce per load balancer checks
     * 
     * @return JsonResponse
     */
    public function simple(): JsonResponse
    {
        try {
            // Quick check: solo verifica che l'app risponda
            DB::connection()->getPdo();
            
            return response()->json([
                'status' => 'ok',
                'timestamp' => now()->toIso8601String(),
            ], 200);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'timestamp' => now()->toIso8601String(),
            ], 503);
        }
    }

    /**
     * Verifica stato applicazione
     */
    private function checkApp(): array
    {
        try {
            $memoryUsage = memory_get_usage(true);
            $memoryLimit = $this->parseMemoryLimit(ini_get('memory_limit'));
            $memoryPercent = $memoryLimit > 0 ? round(($memoryUsage / $memoryLimit) * 100, 2) : 0;

            return [
                'status' => $memoryPercent > 90 ? 'degraded' : 'healthy',
                'memory_usage_mb' => round($memoryUsage / 1024 / 1024, 2),
                'memory_limit_mb' => round($memoryLimit / 1024 / 1024, 2),
                'memory_usage_percent' => $memoryPercent,
                'php_version' => PHP_VERSION,
            ];
        } catch (\Throwable $e) {
            Log::error('Health check app failed', ['error' => $e->getMessage()]);
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verifica connessione database
     */
    private function checkDatabase(): array
    {
        try {
            $startTime = microtime(true);
            
            // Test connessione
            DB::connection()->getPdo();
            
            // Test query semplice
            $result = DB::selectOne('SELECT 1 as test');
            
            $queryTime = round((microtime(true) - $startTime) * 1000, 2);
            
            if (!$result || $result->test !== 1) {
                throw new \Exception('Query test failed');
            }

            return [
                'status' => $queryTime > 100 ? 'degraded' : 'healthy',
                'connection' => 'ok',
                'query_time_ms' => $queryTime,
                'driver' => DB::connection()->getDriverName(),
            ];
        } catch (\Throwable $e) {
            Log::error('Health check database failed', ['error' => $e->getMessage()]);
            return [
                'status' => 'unhealthy',
                'connection' => 'failed',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verifica cache
     */
    private function checkCache(): array
    {
        try {
            $startTime = microtime(true);
            $testKey = 'health_check_' . now()->timestamp;
            $testValue = 'test_' . Str()->random(10);

            // Test write
            Cache::put($testKey, $testValue, 10);
            
            // Test read
            $retrieved = Cache::get($testKey);
            
            // Cleanup
            Cache::forget($testKey);
            
            $cacheTime = round((microtime(true) - $startTime) * 1000, 2);

            if ($retrieved !== $testValue) {
                throw new \Exception('Cache read/write mismatch');
            }

            return [
                'status' => $cacheTime > 50 ? 'degraded' : 'healthy',
                'read_write' => 'ok',
                'response_time_ms' => $cacheTime,
                'driver' => config('cache.default'),
            ];
        } catch (\Throwable $e) {
            Log::error('Health check cache failed', ['error' => $e->getMessage()]);
            return [
                'status' => 'degraded', // Cache non critico, status degraded invece di unhealthy
                'read_write' => 'failed',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verifica storage
     */
    private function checkStorage(): array
    {
        try {
            $startTime = microtime(true);
            
            // Test disco pubblico
            $publicExists = Storage::disk('public')->exists('.');
            
            // Test disco src (produzione - Supabase)
            $srcExists = true;
            if (app()->environment('production')) {
                try {
                    $srcExists = Storage::disk('src')->exists('.');
                } catch (\Throwable $e) {
                    $srcExists = false;
                }
            }
            
            $storageTime = round((microtime(true) - $startTime) * 1000, 2);

            $status = ($publicExists && $srcExists) ? 'healthy' : 'degraded';

            return [
                'status' => $status,
                'public_disk' => $publicExists ? 'ok' : 'failed',
                'src_disk' => $srcExists ? 'ok' : 'not_checked',
                'response_time_ms' => $storageTime,
            ];
        } catch (\Throwable $e) {
            Log::error('Health check storage failed', ['error' => $e->getMessage()]);
            return [
                'status' => 'degraded',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Parse memory limit da stringa PHP (es: "128M", "1G")
     */
    private function parseMemoryLimit(string $limit): int
    {
        if ($limit === '-1') {
            return PHP_INT_MAX;
        }

        $limit = trim($limit);
        $last = strtolower($limit[strlen($limit) - 1]);
        $value = (int) $limit;

        switch ($last) {
            case 'g':
                $value *= 1024;
                // fallthrough
            case 'm':
                $value *= 1024;
                // fallthrough
            case 'k':
                $value *= 1024;
        }

        return $value;
    }
}

