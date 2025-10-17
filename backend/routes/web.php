<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['ok' => true, 'app' => 'backend-root']);
});