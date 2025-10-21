<?php

use App\Http\Controllers\Api\AttestatiController;
use App\Http\Controllers\Api\CvController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\UserPublicController;
use App\Http\Controllers\Api\WhatIDoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

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

// Gruppo API "stateless": rimuoviamo qualsiasi middleware di sessione/cookie/csrf
Route::middleware(['api','throttle:60,1'])
    ->withoutMiddleware([
        StartSession::class,
        AddQueuedCookiesToResponse::class,
        EncryptCookies::class,
        VerifyCsrfToken::class,
        ShareErrorsFromSession::class,
    ])
    ->group(function () {

        // READ-ONLY con cache HTTP (vedi middleware sotto)
        Route::middleware('http.cache:300')->group(function () {
            Route::get('testimonials', [TestimonialController::class, 'index']);
            Route::get('projects',     [ProjectController::class, 'index']);
            Route::get('cv',           [CvController::class, 'index']);
            Route::get('what-i-do',    [WhatIDoController::class, 'index']);
            Route::get('attestati',    [AttestatiController::class, 'index']);
            Route::get('users/{user}/public-profile', [UserPublicController::class, 'show']);
            Route::get('public-profile',              [UserPublicController::class, 'me']); // pubblico (profilo ridotto)
        });

        // Form contatti (rate limit personalizzato)
        Route::middleware('throttle:contact')->post('/contact', [ContactController::class, 'send']);

        // Auth senza sessione (Sanctum con token o Bearer)
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login',    [AuthController::class, 'login']);

        // Rotte protette
        Route::middleware(['auth:sanctum','fresh'])->group(function () {
            Route::get('/me',      [AuthController::class, 'me']);     // profilo completo autenticato
            Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Fallback 404 JSON
    Route::fallback(fn() => new JsonResponse(['ok'=>false,'error'=>'Not Found'], 404, [], JSON_UNESCAPED_UNICODE));
});