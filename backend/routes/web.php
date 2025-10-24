<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

// Endpoint temporaneo per eseguire il seeder in produzione
Route::get('/run-seeder', function () {
    try {
        // Esegui il seeder
        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'UserProfileAndSocialSeeder']);
        
        // Pulisci cache
        \Illuminate\Support\Facades\Artisan::call('cache:clear');
        \Illuminate\Support\Facades\Artisan::call('config:clear');
        
        return response()->json([
            'status' => 'success',
            'message' => 'Seeder eseguito con successo in produzione',
            'timestamp' => now()->toISOString(),
            'output' => \Illuminate\Support\Facades\Artisan::output()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Errore durante esecuzione seeder: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ], 500);
    }
});