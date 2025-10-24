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

// Endpoint temporaneo per aggiornare solo il telefono su Supabase
Route::get('/update-phone', function () {
    try {
        use App\Models\User;
        use App\Models\UserProfile;
        
        // Trova l'utente Marzio
        $user = User::where('email', 'marziofarina@icloud.com')->first();
        
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Utente non trovato',
                'timestamp' => now()->toISOString()
            ], 404);
        }
        
        // Aggiorna solo il telefono e location
        $profile = UserProfile::where('user_id', $user->id)->first();
        
        if ($profile) {
            $profile->phone = '+39 351 820 2248';
            $profile->location = 'San Valentino Torio (SA)';
            $profile->save();
        } else {
            // Crea il profilo se non esiste
            $profile = UserProfile::create([
                'user_id' => $user->id,
                'phone' => '+39 351 820 2248',
                'location' => 'San Valentino Torio (SA)',
                'title' => 'Full Stack Developer'
            ]);
        }
        
        return response()->json([
            'status' => 'success',
            'message' => 'Telefono aggiornato su Supabase!',
            'timestamp' => now()->toISOString(),
            'user' => $user->name . ' ' . $user->surname,
            'phone' => $profile->phone,
            'location' => $profile->location
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Errore: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ], 500);
    }
});