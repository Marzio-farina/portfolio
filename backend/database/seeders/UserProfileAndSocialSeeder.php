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
                'phone'    => '+39 3518202248',
                'location' => 'San Valentino Torio (SA)',
            ]
        );

        // Elenco dei social statici di default
        $socials = [
            [
                'provider' => 'github',
                'handle'   => 'MarzioFarina',
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