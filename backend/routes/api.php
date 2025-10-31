<?php

/**
 * API Routes for Portfolio Application
 * 
 * This file defines all API endpoints for the portfolio application.
 * Routes are organized by functionality and include proper middleware
 * for authentication, rate limiting, and caching.
 */

use App\Http\Controllers\Api\AttestatiController;
use App\Http\Controllers\Api\AvatarController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CvController;
use App\Http\Controllers\Api\CvFileController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TechnologyController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\UserPublicController;
use App\Http\Controllers\Api\WhatIDoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

// ============================================================================
// CORS Preflight Handler
// ============================================================================
Route::options('/{any}', function () {
    return response()->noContent();
})->where('any', '.*');

// ============================================================================
// Health Check Endpoints
// ============================================================================

/**
 * Ping endpoint for health checks
 * Returns server status and current timestamp
 */
Route::get('ping', function () {
    return new JsonResponse([
        'ok' => true,
        'time' => now()->toIso8601String(),
    ], 200, [], JSON_UNESCAPED_UNICODE);
})->name('ping');

/**
 * Diagnostic endpoint for debugging
 * Shows registered routes and system information
 */
Route::get('_diag', function () {
    $routesCollection = Route::getRoutes();
    $routesArray = method_exists($routesCollection, 'getRoutes')
        ? $routesCollection->getRoutes()
        : [];

    return new JsonResponse([
        'hasPing' => Route::has('ping'),
        'count' => count($routesArray),
        'sample' => array_slice(
            array_map(static fn($r) => $r->uri(), $routesArray), 
            0, 
            50
        ),
    ]);
});

// ============================================================================
// API Routes Group
// ============================================================================

/**
 * Main API routes group with stateless configuration
 * Removes session/cookie/CSRF middleware for API-only usage
 */
// Throttle meno aggressivo in locale per sviluppo
$throttleLimit = app()->environment('local') ? '1000,1' : '300,1';

Route::middleware(['api', "throttle:{$throttleLimit}", 'db.connection'])
    ->withoutMiddleware([
        StartSession::class,
        AddQueuedCookiesToResponse::class,
        EncryptCookies::class,
        VerifyCsrfToken::class,
        ShareErrorsFromSession::class,
    ])
    ->group(function () {

        // ====================================================================
        // Public Read-Only Endpoints (with HTTP caching, no throttle)
        // ====================================================================
        Route::middleware(['db.connection','http.cache:300'])
            ->withoutMiddleware([\Illuminate\Routing\Middleware\ThrottleRequests::class])
            ->group(function () {
                Route::get('testimonials', [TestimonialController::class, 'index']);
                Route::get('testimonials/icons', [TestimonialController::class, 'getIcons']); // Tutte le icone
                Route::get('testimonials/default-avatars', [TestimonialController::class, 'getDefaultAvatars']); // Solo avatar predefiniti
                Route::get('projects', [ProjectController::class, 'index']);
                Route::get('categories', [CategoryController::class, 'index']);
                Route::get('technologies', [TechnologyController::class, 'index']);
                Route::get('cv', [CvController::class, 'index']);
                Route::get('what-i-do', [WhatIDoController::class, 'index']);
                Route::get('attestati', [AttestatiController::class, 'index']);
            });

        // Profilo pubblico
        Route::get('public-profile', [UserPublicController::class, 'me']);
        // Compatibilità: vecchia rotta usata dal frontend
        Route::get('users/slug/{slug}/public-profile', [UserPublicController::class, 'showBySlug']);
        // Rotta slug-based "pulita" (preferita): /{slug}/public-profile
        Route::get('{slug}/public-profile', [UserPublicController::class, 'showBySlug'])
            ->where('slug', '^(?!api$|users$|testimonials$|projects$|cv$|what-i-do$|attestati$|avatars$|contact$|login$|register$)[A-Za-z0-9-]+$');

        // CV Files - download pubblico (utente identificato opzionalmente)
        // Spostato fuori da gruppi con http.cache/throttle
        Route::get('cv-files/default', [CvFileController::class, 'getDefault']);
        Route::get('cv-files/{id}/download', [CvFileController::class, 'download'])->name('api.cv-files.download');

        // ====================================================================
        // Public Write Endpoints (with rate limiting)
        // ====================================================================
        $writeThrottleLimit = app()->environment('local') ? '100,1' : '20,1';
        Route::middleware("throttle:{$writeThrottleLimit}")->group(function () {
            Route::post('testimonials', [TestimonialController::class, 'store']);
            Route::post('avatars/upload', [AvatarController::class, 'upload']); // Upload avatar
        });

        // ====================================================================
        // Contact Form (with custom rate limiting)
        // ====================================================================
        Route::middleware('throttle:10,1')
            ->post('/contact', [ContactController::class, 'send']);

        // ====================================================================
        // Authentication Endpoints
        // ====================================================================
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

        // ====================================================================
        // Protected Routes (require authentication)
        // ====================================================================
        Route::middleware(['auth:sanctum', 'fresh'])->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::put('/profile', [AuthController::class, 'updateProfile']);
            Route::delete('avatars/{id}', [AvatarController::class, 'delete']); // Delete avatar
            
            // CV Files - gestione completa (richiede autenticazione)
            Route::get('cv-files', [CvFileController::class, 'index']);
            Route::post('cv-files/upload', [CvFileController::class, 'upload']);
            Route::delete('cv-files/{id}', [CvFileController::class, 'delete']);
            
            // Attestati - creazione, aggiornamento ed eliminazione richiedono autenticazione
            Route::post('attestati', [AttestatiController::class, 'store']);
            Route::put('attestati/{attestato}', [AttestatiController::class, 'update']);
            Route::delete('attestati/{attestato}', [AttestatiController::class, 'destroy']);
            
            // Projects - creazione, aggiornamento ed eliminazione richiedono autenticazione
            Route::post('projects', [ProjectController::class, 'store']);
            Route::put('projects/{project}', [ProjectController::class, 'update']);
            Route::delete('projects/{project}', [ProjectController::class, 'destroy']);
        });

        // ====================================================================
        // Fallback for undefined routes
        // ====================================================================
        Route::fallback(function () {
            return new JsonResponse([
                'ok' => false,
                'error' => 'Not Found'
            ], 404, [], JSON_UNESCAPED_UNICODE);
        });
    });