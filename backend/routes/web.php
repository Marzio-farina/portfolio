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

// Endpoint per sincronizzare i dati in produzione
Route::get('/sync-data', function () {
    try {
        // Esegui il seeder per aggiornare i dati
        Artisan::call('db:seed', ['--class' => 'UserProfileAndSocialSeeder']);
        
        // Pulisci la cache
        Artisan::call('cache:clear');
        Artisan::call('config:clear');
        
        return response()->json([
            'status' => 'success',
            'message' => 'Dati sincronizzati correttamente',
            'timestamp' => now()->toISOString()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Errore durante la sincronizzazione: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ], 500);
    }
});