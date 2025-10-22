<?php

/**
 * Web Routes for Portfolio Application
 * 
 * This file defines web-specific routes including image proxy
 * and development/debugging endpoints.
 */

use App\Http\Controllers\ImageProxyController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

// ============================================================================
// Root Endpoint
// ============================================================================

/**
 * Application root endpoint
 * Returns basic application information
 */
Route::get('/', function () {
    return new JsonResponse([
        'ok' => true,
        'app' => 'backend-root'
    ], 200, [], JSON_UNESCAPED_UNICODE);
});

// ============================================================================
// Development/Debug Endpoints
// ============================================================================

/**
 * Routes dump endpoint for development
 * Lists all registered routes for debugging purposes
 */
Route::get('/routes-dump', function () {
    $routes = Route::getRoutes();
    $uris = [];

    foreach ($routes as $route) {
        $uris[] = $route->uri();
    }

    return new JsonResponse([
        'count' => count($uris),
        'uris' => $uris,
        'hasPing' => Route::has('ping'),
    ]);
});

// ============================================================================
// Image Proxy Endpoint
// ============================================================================

/**
 * Image proxy endpoint for serving and processing images
 * Removes session/cookie/CSRF middleware for stateless operation
 * Includes rate limiting to prevent abuse
 */
Route::get('/i/{path}', [ImageProxyController::class, 'show'])
    ->where('path', '.*')
    ->withoutMiddleware([
        StartSession::class,
        AddQueuedCookiesToResponse::class,
        EncryptCookies::class,
        ShareErrorsFromSession::class,
        VerifyCsrfToken::class,
    ])
    ->middleware('throttle:60,1')
    ->name('img.show');