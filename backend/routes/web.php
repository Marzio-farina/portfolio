<?php

use App\Http\Controllers\ImageProxyController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

Route::get('/', function () {
    return new JsonResponse(['ok' => true, 'app' => 'backend-root'], 200, [], JSON_UNESCAPED_UNICODE);
});

Route::get('/routes-dump', function () {
    $routes = Route::getRoutes();

    $uris = [];
    foreach ($routes as $r) {
        $uris[] = $r->uri();
    }

    return new \Illuminate\Http\JsonResponse([
        'count'   => count($uris),
        'uris'    => $uris,
        'hasPing' => Route::has('ping'),
    ]);
});

Route::get('/i/{path}', [ImageProxyController::class, 'show'])
    ->where('path', '.*')
    // ❌ via le robe di sessione/cookie/csrf
    ->withoutMiddleware([
        StartSession::class,
        AddQueuedCookiesToResponse::class,
        EncryptCookies::class,
        ShareErrorsFromSession::class,
        VerifyCsrfToken::class,
    ])
    // rate limit “leggero” per evitare abusi
    ->middleware('throttle:images,120,1') // opzionale (se non hai definito "images", usa throttle:60,1)
    ->name('img.show');