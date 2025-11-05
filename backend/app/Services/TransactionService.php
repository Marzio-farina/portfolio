<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Transaction Service
 * 
 * Gestisce transazioni database con rollback automatico e logging
 */
class TransactionService
{
    /**
     * Esegui una callback dentro una transazione
     * 
     * @param callable $callback Funzione da eseguire nella transazione
     * @param int $attempts Numero di tentativi in caso di deadlock
     * @return mixed Risultato della callback
     * @throws Throwable
     */
    public static function execute(callable $callback, int $attempts = 1): mixed
    {
        return DB::transaction(function () use ($callback) {
            try {
                return $callback();
            } catch (Throwable $e) {
                Log::error('Transaction failed', [
                    'error' => $e->getMessage(),
                    'code' => $e->getCode(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
                throw $e;
            }
        }, $attempts);
    }

    /**
     * Esegui con rollback manuale se necessario
     * 
     * @param callable $callback Funzione da eseguire
     * @return array ['success' => bool, 'data' => mixed, 'error' => string|null]
     */
    public static function executeWithResult(callable $callback): array
    {
        DB::beginTransaction();

        try {
            $result = $callback();
            DB::commit();

            return [
                'success' => true,
                'data' => $result,
                'error' => null,
            ];

        } catch (Throwable $e) {
            DB::rollBack();

            Log::error('Transaction rolled back', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'data' => null,
                'error' => $e->getMessage(),
            ];
        }
    }
}

