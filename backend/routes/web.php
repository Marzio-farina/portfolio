<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

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
        Artisan::call('db:seed', ['--class' => 'UserProfileAndSocialSeeder']);
        
        // Pulisci cache
        Artisan::call('cache:clear');
        Artisan::call('config:clear');
        
        return response()->json([
            'status' => 'success',
            'message' => 'Seeder eseguito con successo in produzione',
            'timestamp' => now()->toISOString()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Errore: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ], 500);
    }
});