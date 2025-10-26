<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Response;

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

// ============================================================================
// Asset Routes (for both local development and production)
// ============================================================================

/**
 * Serve avatar files
 * 
 * In localhost: Serve from storage/app/public/avatars
 * In production (Vercel): Will be handled by vercel.json routes,
 *                        but this endpoint works as fallback
 * 
 * Cache: 1 year (avatars are immutable)
 */
Route::get('/avatars/{filename}', function ($filename) {
    $path = 'avatars/' . $filename;
    
    // Validate filename to prevent path traversal
    if (str_contains($filename, '..') || str_contains($filename, '/')) {
        abort(403);
    }
    
    if (!Storage::disk('public')->exists($path)) {
        abort(404);
    }
    
    $file = Storage::disk('public')->path($path);
    
    return response()
        ->file($file, [
            'Cache-Control' => 'public, max-age=31536000, immutable', // 1 year cache
            'Content-Type' => mime_content_type($file)
        ]);
})->where('filename', '[a-zA-Z0-9._-]+');
