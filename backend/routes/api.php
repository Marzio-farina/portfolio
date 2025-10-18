<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;

Route::prefix('api')->group(function () {
    Route::get('ping', function () {
        return new JsonResponse([
            'ok'   => true,
            'time' => now()->toIso8601String(),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    })->name('ping');

    // Diag minimale
    Route::get('_diag', function () {
        return new JsonResponse([
            'hasPing' => Route::has('ping'),
            'env'     => app()->environment(),
        ]);
    });

    // Fallback per tutte le /api/* non trovate
    Route::fallback(function () {
        return new JsonResponse(['ok' => false, 'error' => 'Not Found'], 404, [], JSON_UNESCAPED_UNICODE);
    });
});