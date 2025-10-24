<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\SocialAccount;

class SyncProductionData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:production-data';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincronizza i dati di produzione con quelli locali';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Iniziando sincronizzazione dati produzione...');

        try {
            // Trova l'utente Marzio
            $user = User::where('email', 'marziofarina@icloud.com')->first();
            
            if (!$user) {
                $this->error('❌ Utente non trovato');
                return 1;
            }

            $this->info("✅ Utente trovato: {$user->name} {$user->surname}");

            // Aggiorna il profilo
            $profile = $user->profile;
            if (!$profile) {
                $profile = new UserProfile();
                $profile->user_id = $user->id;
            }

            $profile->title = 'Full Stack Developer';
            $profile->headline = null;
            $profile->bio = 'Sono Full Stack Developer e sviluppatore di applicazioni desktop con una forte attitudine analitica e una costante voglia di migliorarmi.

Nel corso degli anni ho collaborato con aziende IT e realtà specializzate in automazione, esperienze che mi hanno permesso di affrontare progetti complessi e di affinare una metodologia di lavoro precisa, orientata ai risultati e alla solidità del codice.

Amo tradurre le esigenze di un\'idea o di un processo aziendale in soluzioni software funzionali, scalabili e affidabili, che semplificano la vita degli utenti e migliorano la produttività.

Prediligo la parte logica della programmazione, ma mi piace anche sperimentare nel design, curando l\'aspetto visivo e l\'esperienza d\'uso dei miei progetti per renderli intuitivi e piacevoli da utilizzare.

Le tecnologie che utilizzo più frequentemente sono Laravel, Angular, .NET ed Electron, strumenti con cui costruisco applicazioni web e desktop su misura, capaci di adattarsi a diversi contesti e necessità.

Negli anni ho realizzato progetti personalizzati per aziende e privati, ottimizzando processi interni e sviluppando gestionali dedicati per rendere più efficiente il mio stesso lavoro e quello dei miei clienti.

Ogni nuovo progetto rappresenta per me una sfida stimolante e un\'occasione per imparare qualcosa di nuovo — perché la mia filosofia è semplice ma incrollabile:

Non mollare mai.

Nel mio percorso continuo a ricercare l\'equilibrio tra precisione tecnica e creatività, convinto che un software ben progettato debba essere non solo stabile e performante, ma anche piacevole da usare e da guardare.

Il mio obiettivo è quello di trasformare le idee in applicazioni concrete, funzionali e curate nei dettagli, portando valore reale a chi le utilizza ogni giorno.';
            $profile->phone = '+39 3518202248';
            $profile->location = 'San Valentino Torio (SA)';
            $profile->avatar_url = null;
            $profile->save();

            $this->info('✅ Profilo aggiornato');

            // Rimuovi social esistenti
            SocialAccount::where('user_id', $user->id)->delete();

            // Aggiungi social accounts
            $socials = [
                [
                    'provider' => 'facebook',
                    'handle' => 'marzio.farina',
                    'url' => 'https://www.facebook.com/marzio.farina.77/'
                ],
                [
                    'provider' => 'github',
                    'handle' => 'MarzioFarina',
                    'url' => 'https://github.com/Marzio-farina'
                ],
                [
                    'provider' => 'instagram',
                    'handle' => 'marzio.dev',
                    'url' => 'https://www.instagram.com/marzio__f/'
                ],
                [
                    'provider' => 'linkedin',
                    'handle' => 'marzio-farina',
                    'url' => 'https://www.linkedin.com/in/marziano-farina-215b16214/'
                ]
            ];

            foreach ($socials as $social) {
                SocialAccount::create([
                    'user_id' => $user->id,
                    'provider' => $social['provider'],
                    'handle' => $social['handle'],
                    'url' => $social['url']
                ]);
            }

            $this->info('✅ Social accounts aggiornati');

            // Pulisci cache
            $this->call('cache:clear');
            $this->call('config:clear');

            $this->info('✅ Cache pulita');

            $this->info('🎉 Sincronizzazione completata con successo!');
            return 0;

        } catch (\Exception $e) {
            $this->error('❌ Errore durante la sincronizzazione: ' . $e->getMessage());
            return 1;
        }
    }
}