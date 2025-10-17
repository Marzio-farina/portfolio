<?php

use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json([
        'ok'      => true,
        'php'     => PHP_VERSION,
        'laravel' => app()->version(),
        'time'    => now()->toIso8601String(),
    ]);
});