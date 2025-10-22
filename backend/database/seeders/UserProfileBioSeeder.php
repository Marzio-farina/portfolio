<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;

class UserProfileBioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Trova l'utente principale (Marzio Farina)
        $user = User::where('email', 'marziofarina@icloud.com')->first();
        
        if (!$user) {
            $this->command->warn('Utente marziofarina@icloud.com non trovato. Creazione profilo per il primo utente disponibile.');
            $user = User::first();
        }
        
        if (!$user) {
            $this->command->error('Nessun utente trovato nel database. Eseguire prima UserSeeder.');
            return;
        }
        
        // Crea o aggiorna il profilo utente
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
                'phone' => '+39 123 456 7890',
                'location' => 'Italia',
                'avatar_url' => null
            ]
        );
        
        $this->command->info("Profilo utente aggiornato per {$user->name} {$user->surname}");
    }
}