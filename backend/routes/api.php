<?php

use App\Http\Controllers\Api\CvController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\UserPublicController;
use App\Http\Controllers\Api\WhatIDoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;

Route::options('/{any}', function () {
    return response()->noContent(); // 204
})->where('any', '.*');

Route::get('ping', function () {
    return new JsonResponse([
        'ok'   => true,
        'time' => now()->toIso8601String(),
    ], 200, [], JSON_UNESCAPED_UNICODE);
})->name('ping');

/**
 * /api/_diag
 * Diagnostica leggera: verifica che la rotta 'ping' sia registrata
 * e mostra un piccolo campione di URI. Niente "count()" sul
 * RouteCollectionInterface per non far arrabbiare Intelephense.
 */
Route::get('_diag', function () {
    /** @var \Illuminate\Routing\RouteCollection $routesCollection */
    $routesCollection = Route::getRoutes(); // In runtime è RouteCollection, non solo l'interfaccia

    // Ottieni l'array nativo di Route eliminando i warning dell'IDE
    /** @var array<\Illuminate\Routing\Route> $routesArray */
    $routesArray = method_exists($routesCollection, 'getRoutes')
        ? $routesCollection->getRoutes()
        : []; // fallback davvero raro

    $count  = count($routesArray);
    $sample = array_slice(array_map(static fn($r) => $r->uri(), $routesArray), 0, 50);

    return new JsonResponse([
        'hasPing' => Route::has('ping'),
        'count'   => $count,
        'sample'  => $sample,
    ]);
});

// Fallback per tutte le /api/* non trovate
Route::fallback(function () {
    return new JsonResponse(['ok' => false, 'error' => 'Not Found'], 404, [], JSON_UNESCAPED_UNICODE);
});

Route::get('testimonials', [TestimonialController::class, 'index']);
Route::get('projects', [ProjectController::class, 'index']);
Route::get('cv',[CvController::class, 'index']);
Route::get('what-i-do',[WhatIDoController::class, 'index']);
Route::get('users/{user}/public-profile', [UserPublicController::class, 'show']);
Route::get('public-profile',              [UserPublicController::class, 'me']);
Route::middleware('throttle:contact')->post('/contact', [ContactController::class, 'send']);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'fresh'])->group(function () {
    Route::get('/me',     [AuthController::class, 'me']);
    Route::post('/logout',[AuthController::class, 'logout']);
    // altre rotte protette qui...
});