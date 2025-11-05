<?php

namespace Database\Seeders;

use App\Models\SocialAccount;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserProfileAndSocialSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Trova l'utente principale (Marzio)
        $user = User::where('email', 'marziofarina@icloud.com')->first();

        if (!$user) {
            $this->command->warn('⚠️ Utente "Marzio" non trovato. Esegui prima UserSeeder.');
            return;
        }

        // Crea o aggiorna il profilo
        UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'phone'    => '+39 351 820 2248',
                'location' => 'San Valentino Torio (SA)',
                'title'    => 'Full Stack Developer',
                'bio'      => 'Sono Full Stack Developer e sviluppatore di applicazioni desktop con una forte attitudine analitica e una costante voglia di migliorarmi.

Nel corso degli anni ho collaborato con aziende IT e realtà specializzate in automazione, esperienze che mi hanno permesso di affrontare progetti complessi e di affinare una metodologia di lavoro precisa, orientata ai risultati e alla solidità del codice.

Amo tradurre le esigenze di un\'idea o di un processo aziendale in soluzioni software funzionali, scalabili e affidabili, che semplificano la vita degli utenti e migliorano la produttività.

Prediligo la parte logica della programmazione, ma mi piace anche sperimentare nel design, curando l\'aspetto visivo e l\'esperienza d\'uso dei miei progetti per renderli intuitivi e piacevoli da utilizzare.

Le tecnologie che utilizzo più frequentemente sono Laravel, Angular, .NET ed Electron, strumenti con cui costruisco applicazioni web e desktop su misura, capaci di adattarsi a diversi contesti e necessità.

Negli anni ho realizzato progetti personalizzati per aziende e privati, ottimizzando processi interni e sviluppando gestionali dedicati per rendere più efficiente il mio stesso lavoro e quello dei miei clienti.

Ogni nuovo progetto rappresenta per me una sfida stimolante e un\'occasione per imparare qualcosa di nuovo.
Perché la mia filosofia è semplice ma incrollabile: "Non mollare mai".

Nel mio percorso continuo a ricercare l\'equilibrio tra precisione tecnica e creatività, convinto che un software ben progettato debba essere non solo stabile e performante, ma anche piacevole da usare e da guardare.

Il mio obiettivo è quello di trasformare le idee in applicazioni concrete, funzionali e curate nei dettagli, portando valore reale a chi le utilizza ogni giorno.',
            ]
        );

        // Elenco dei social statici di default
        $socials = [
            [
                'provider' => 'github',
                'handle'   => 'Marzio-farina',
                'url'      => 'https://github.com/Marzio-farina',
            ],
            [
                'provider' => 'linkedin',
                'handle'   => 'marzio-farina',
                'url'      => 'https://www.linkedin.com/in/marziano-farina-215b16214/',
            ],
            [
                'provider' => 'instagram',
                'handle'   => 'marzio.dev',
                'url'      => 'https://www.instagram.com/marzio__f/',
            ],
            [
                'provider' => 'facebook',
                'handle'   => 'marzio.farina',
                'url'      => 'https://www.facebook.com/marzio.farina.77/',
            ],
        ];

        // Inserisce o aggiorna ciascun social
        foreach ($socials as $s) {
            SocialAccount::updateOrCreate(
                ['user_id' => $user->id, 'provider' => $s['provider']],
                ['handle' => $s['handle'], 'url' => $s['url']]
            );
        }

        $this->command->info('✅ Profilo e social di Marzio aggiornati correttamente.');
    }
}