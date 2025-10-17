<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\JsonResponse;

Route::get('/', function () {
    return new JsonResponse(['ok' => true, 'app' => 'backend-root'], 200, [], JSON_UNESCAPED_UNICODE);
});