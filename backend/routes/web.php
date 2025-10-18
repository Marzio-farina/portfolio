<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;

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