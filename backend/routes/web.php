<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;

Route::get('/', function () {
    return new JsonResponse(['ok' => true, 'app' => 'backend-root'], 200, [], JSON_UNESCAPED_UNICODE);
});

Route::get('/api/ping', function () {
    return new JsonResponse([
        'ok'   => true,
        'time' => now()->toIso8601String(),
    ], 200, [], JSON_UNESCAPED_UNICODE);
});

Route::get('/api/_diag', function () {
    // Piccola diag lato web per coerenza
    $routesCollection = Route::getRoutes();
    /** @var array<\Illuminate\Routing\Route> $routesArray */
    $routesArray = method_exists($routesCollection, 'getRoutes')
        ? $routesCollection->getRoutes()
        : [];

    $count  = count($routesArray);
    $sample = array_slice(array_map(static fn($r) => $r->uri(), $routesArray), 0, 50);

    return new JsonResponse([
        'hasPing' => Route::has('ping'),
        'count'   => $count,
        'sample'  => $sample,
    ]);
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