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

// Endpoint temporaneo per aggiornare Supabase in produzione
Route::get('/update-supabase', function () {
    try {
        use App\Models\User;
        use App\Models\UserProfile;
        use App\Models\SocialAccount;
        
        // Trova l'utente Marzio
        $user = User::where('email', 'marziofarina@icloud.com')->first();
        
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Utente non trovato',
                'timestamp' => now()->toISOString()
            ], 404);
        }
        
        // Aggiorna il profilo su Supabase
        $profile = UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'title' => 'Full Stack Developer',
                'bio' => 'Sono Full Stack Developer e sviluppatore di applicazioni desktop con una forte attitudine analitica e una costante voglia di migliorarmi.

Nel corso degli anni ho collaborato con aziende IT e realtà specializzate in automazione, esperienze che mi hanno permesso di affrontare progetti complessi e di affinare una metodologia di lavoro precisa, orientata ai risultati e alla solidità del codice.

Amo tradurre le esigenze di un\'idea o di un processo aziendale in soluzioni software funzionali, scalabili e affidabili, che semplificano la vita degli utenti e migliorano la produttività.

Prediligo la parte logica della programmazione, ma mi piace anche sperimentare nel design, curando l\'aspetto visivo e l\'esperienza d\'uso dei miei progetti per renderli intuitivi e piacevoli da utilizzare.

Le tecnologie che utilizzo più frequentemente sono Laravel, Angular, .NET ed Electron, strumenti con cui costruisco applicazioni web e desktop su misura, capaci di adattarsi a diversi contesti e necessità.

Negli anni ho realizzato progetti personalizzati per aziende e privati, ottimizzando processi interni e sviluppando gestionali dedicati per rendere più efficiente il mio stesso lavoro e quello dei miei clienti.

Ogni nuovo progetto rappresenta per me una sfida stimolante e un\'occasione per imparare qualcosa di nuovo — perché la mia filosofia è semplice ma incrollabile:

Non mollare mai.

Nel mio percorso continuo a ricercare l\'equilibrio tra precisione tecnica e creatività, convinto che un software ben progettato debba essere non solo stabile e performante, ma anche piacevole da usare e da guardare.

Il mio obiettivo è quello di trasformare le idee in applicazioni concrete, funzionali e curate nei dettagli, portando valore reale a chi le utilizza ogni giorno.',
                'phone' => '+39 351 820 2248',
                'location' => 'San Valentino Torio (SA)',
                'avatar_url' => null
            ]
        );
        
        // Aggiorna social accounts su Supabase
        $socials = [
            ['provider' => 'github', 'handle' => 'MarzioFarina', 'url' => 'https://github.com/Marzio-farina'],
            ['provider' => 'linkedin', 'handle' => 'marzio-farina', 'url' => 'https://www.linkedin.com/in/marziano-farina-215b16214/'],
            ['provider' => 'instagram', 'handle' => 'marzio.dev', 'url' => 'https://www.instagram.com/marzio__f/'],
            ['provider' => 'facebook', 'handle' => 'marzio.farina', 'url' => 'https://www.facebook.com/marzio.farina.77/']
        ];
        
        foreach ($socials as $social) {
            SocialAccount::updateOrCreate(
                ['user_id' => $user->id, 'provider' => $social['provider']],
                ['handle' => $social['handle'], 'url' => $social['url']]
            );
        }
        
        return response()->json([
            'status' => 'success',
            'message' => 'Database Supabase aggiornato con successo!',
            'timestamp' => now()->toISOString(),
            'user' => $user->name . ' ' . $user->surname,
            'phone' => $profile->phone,
            'location' => $profile->location,
            'updated_at' => $profile->updated_at
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Errore: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ], 500);
    }
});