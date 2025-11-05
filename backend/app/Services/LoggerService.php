<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Logger Service
 * 
 * Servizio centralizzato per logging strutturato con context automatico
 */
class LoggerService
{
    /**
     * Log di un'azione con context automatico
     * 
     * @param string $action Descrizione dell'azione
     * @param array $context Context aggiuntivo
     * @param string $level Livello di log (info, warning, error, debug)
     * @return void
     */
    public static function logAction(
        string $action, 
        array $context = [], 
        string $level = 'info'
    ): void {
        $enrichedContext = array_merge(
            self::getBaseContext(),
            $context
        );

        Log::log($level, $action, $enrichedContext);
    }

    /**
     * Log di un errore con trace completo
     * 
     * @param string $message Messaggio di errore
     * @param Throwable $exception Eccezione
     * @param array $context Context aggiuntivo
     * @return void
     */
    public static function logError(
        string $message, 
        Throwable $exception, 
        array $context = []
    ): void {
        $enrichedContext = array_merge(
            self::getBaseContext(),
            [
                'exception_class' => get_class($exception),
                'exception_message' => $exception->getMessage(),
                'exception_code' => $exception->getCode(),
                'exception_file' => $exception->getFile(),
                'exception_line' => $exception->getLine(),
                'stack_trace' => $exception->getTraceAsString(),
            ],
            $context
        );

        Log::error($message, $enrichedContext);
    }

    /**
     * Log di un warning
     * 
     * @param string $message Messaggio di warning
     * @param array $context Context aggiuntivo
     * @return void
     */
    public static function logWarning(string $message, array $context = []): void
    {
        self::logAction($message, $context, 'warning');
    }

    /**
     * Log di debug (solo in ambiente non production)
     * 
     * @param string $message Messaggio di debug
     * @param array $context Context aggiuntivo
     * @return void
     */
    public static function logDebug(string $message, array $context = []): void
    {
        if (!app()->environment('production')) {
            self::logAction($message, $context, 'debug');
        }
    }

    /**
     * Log di un evento di sicurezza
     * 
     * @param string $event Evento di sicurezza
     * @param array $context Context aggiuntivo
     * @return void
     */
    public static function logSecurity(string $event, array $context = []): void
    {
        $enrichedContext = array_merge(
            self::getBaseContext(),
            ['security_event' => true],
            $context
        );

        Log::warning('[SECURITY] ' . $event, $enrichedContext);
    }

    /**
     * Log di performance
     * 
     * @param string $operation Operazione eseguita
     * @param float $duration Durata in millisecondi
     * @param array $context Context aggiuntivo
     * @return void
     */
    public static function logPerformance(
        string $operation, 
        float $duration, 
        array $context = []
    ): void {
        $enrichedContext = array_merge(
            self::getBaseContext(),
            [
                'performance' => true,
                'duration_ms' => $duration,
                'operation' => $operation,
            ],
            $context
        );

        // Log come warning se l'operazione è lenta
        $level = $duration > 1000 ? 'warning' : 'info';
        Log::log($level, "Performance: {$operation}", $enrichedContext);
    }

    /**
     * Ottieni context base per tutti i log
     * 
     * @return array
     */
    private static function getBaseContext(): array
    {
        $request = request();
        
        return [
            'timestamp' => now()->toIso8601String(),
            'environment' => app()->environment(),
            'user_id' => auth()->id(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'request_id' => $request->header('X-Request-ID') ?? uniqid('req_', true),
        ];
    }

    /**
     * Log di una query lenta
     * 
     * @param string $sql Query SQL
     * @param float $time Tempo di esecuzione
     * @param array $bindings Parametri della query
     * @return void
     */
    public static function logSlowQuery(string $sql, float $time, array $bindings = []): void
    {
        self::logWarning('Slow query detected', [
            'sql' => $sql,
            'time_ms' => $time,
            'bindings' => $bindings,
        ]);
    }

    /**
     * Log di un accesso non autorizzato
     * 
     * @param string $resource Risorsa richiesta
     * @param array $context Context aggiuntivo
     * @return void
     */
    public static function logUnauthorizedAccess(string $resource, array $context = []): void
    {
        self::logSecurity('Unauthorized access attempt', array_merge([
            'resource' => $resource,
        ], $context));
    }

    /**
     * Log di un login fallito
     * 
     * @param string $email Email usata
     * @param string $reason Motivo del fallimento
     * @return void
     */
    public static function logFailedLogin(string $email, string $reason): void
    {
        self::logSecurity('Failed login attempt', [
            'email' => $email,
            'reason' => $reason,
        ]);
    }

    /**
     * Log di un login riuscito
     * 
     * @param int $userId ID utente
     * @param string $email Email utente
     * @return void
     */
    public static function logSuccessfulLogin(int $userId, string $email): void
    {
        self::logAction('User logged in', [
            'user_id' => $userId,
            'email' => $email,
        ]);
    }
}

