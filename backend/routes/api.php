<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;

Route::get('ping', function () {
    return new JsonResponse([
        'ok'   => true,
        'time' => now()->toIso8601String(),
    ], 200, [], JSON_UNESCAPED_UNICODE);
})->name('ping');

// Fallback per tutte le /api/* non trovate
Route::fallback(function () {
    return new JsonResponse(['ok' => false, 'error' => 'Not Found'], 404, [], JSON_UNESCAPED_UNICODE);
});