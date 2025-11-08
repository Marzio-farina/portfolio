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
use App\Http\Controllers\Api\GitHubProxyController;
use App\Http\Controllers\Api\GitHubRepositoryController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\SocialAccountController;
use App\Http\Controllers\Api\TechnologyController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\UserPublicController;
use App\Http\Controllers\Api\WhatIDoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\HealthCheckController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Auth;
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
 * Health check completo - verifica database, cache, storage
 * Utile per monitoring e deployment automation
 */
Route::get('health', [HealthCheckController::class, 'index'])->name('health');

/**
 * Health check semplice - solo status code
 * Più veloce per load balancer checks
 */
Route::get('health/simple', [HealthCheckController::class, 'simple'])->name('health.simple');

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

        // GitHub Repositories - lista repository (pubblico, read-only)
        Route::get('github-repositories', [GitHubRepositoryController::class, 'index']);
        
        // GitHub Proxy - statistiche repository (pubblico, con cache)
        Route::get('github/{owner}/{repo}/stats', [GitHubProxyController::class, 'getRepoStats']);
        Route::get('github/user/{username}/total-commits', [GitHubProxyController::class, 'getUserTotalCommits']);

        // Profilo pubblico
        Route::get('public-profile', [UserPublicController::class, 'me']);
        // Compatibilità: vecchia rotta usata dal frontend
        Route::get('users/slug/{slug}/public-profile', [UserPublicController::class, 'showBySlug']);
        // Rotta slug-based "pulita" (preferita): /{slug}/public-profile
        // Esclude route riservate e pagine pubbliche del frontend
        Route::get('{slug}/public-profile', [UserPublicController::class, 'showBySlug'])
            ->where('slug', '^(?!api$|users$|testimonials$|projects$|cv$|what-i-do$|attestati$|avatars$|contact$|login$|register$|github$|github-repositories$|nuova-recensione$|about$|curriculum$|progetti$|contatti$)[A-Za-z0-9-]+$');

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
        });

        // ====================================================================
        // Upload Endpoints (with custom rate limiting for uploads)
        // ====================================================================
        Route::middleware('throttle:uploads')->group(function () {
            Route::post('avatars/upload', [AvatarController::class, 'upload']); // Upload avatar
        });

        // ====================================================================
        // Contact Form (with custom rate limiting for spam protection)
        // ====================================================================
        Route::middleware('throttle:contact')
            ->post('/contact', [ContactController::class, 'send']);

        // ====================================================================
        // Authentication Endpoints (with strict rate limiting for brute-force protection)
        // ====================================================================
        Route::middleware('throttle:auth')->group(function () {
            Route::post('/register', [AuthController::class, 'register']);
            Route::post('/login', [AuthController::class, 'login']);
            Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
            Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
        });

        // ====================================================================
        // Protected Routes (require authentication)
        // ====================================================================
        Route::middleware(['auth:sanctum', 'fresh'])->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::put('/profile', [AuthController::class, 'updateProfile']);
            Route::delete('avatars/{id}', [AvatarController::class, 'delete']); // Delete avatar
            
            // Social Accounts - gestione link social
            Route::post('social-accounts', [SocialAccountController::class, 'upsert']);
            Route::delete('social-accounts/{provider}', [SocialAccountController::class, 'delete']);
            
            // GitHub Repositories - gestione repository GitHub (richiede autenticazione)
            Route::post('github-repositories', [GitHubRepositoryController::class, 'store']);
            Route::put('github-repositories/reorder', [GitHubRepositoryController::class, 'updateOrder']);
            Route::delete('github-repositories/{id}', [GitHubRepositoryController::class, 'delete']);
            
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
            Route::post('projects/{project}', [ProjectController::class, 'update']); // POST per supportare FormData con file
            Route::patch('projects/{project}/layout', [ProjectController::class, 'updateLayout']); // Aggiorna solo il layout
            Route::patch('projects/{id}/restore', [ProjectController::class, 'restore']); // Ripristina progetto soft-deleted
            Route::delete('projects/{project}', [ProjectController::class, 'destroy']);
            
            // Categories - creazione ed eliminazione richiedono autenticazione
            Route::post('categories', [CategoryController::class, 'store']);
            Route::delete('categories/by-title/{title}', [CategoryController::class, 'destroyByTitle']);
            
            // Technologies - creazione e modifica richiedono autenticazione
            Route::post('technologies', [TechnologyController::class, 'store']);
            Route::put('technologies/{id}', [TechnologyController::class, 'update']);
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