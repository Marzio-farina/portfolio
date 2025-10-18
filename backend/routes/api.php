<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;

Route::get('ping', function () {
    return new JsonResponse([
        'ok'   => true,
        'time' => now()->toIso8601String(),
    ], 200, [], JSON_UNESCAPED_UNICODE);
})->name('ping');

// Diag: verifica che le rotte siano caricate correttamente in prod
Route::get('_diag', function () {
    return new JsonResponse([
        'hasPing' => Route::has('ping'),
        'someUris' => collect(Route::getRoutes())
            ->take(10)               // non stampare tutto
            ->map(fn($r) => $r->uri())
            ->values(),
    ]);
});

// Fallback per tutte le /api/* non trovate
Route::fallback(function () {
    return new JsonResponse(['ok' => false, 'error' => 'Not Found'], 404, [], JSON_UNESCAPED_UNICODE);
});