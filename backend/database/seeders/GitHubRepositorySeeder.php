<?php

namespace Database\Seeders;

use App\Models\GitHubRepository;
use App\Models\User;
use Illuminate\Database\Seeder;

class GitHubRepositorySeeder extends Seeder
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

        // Crea o aggiorna la repository GitHub del portfolio
        GitHubRepository::updateOrCreate(
            ['user_id' => $user->id],
            [
                'owner' => 'Marzio-farina',
                'repo' => 'portfolio',
                'url' => 'https://github.com/Marzio-farina/portfolio',
            ]
        );

        $this->command->info('✅ Repository GitHub di Marzio aggiornata correttamente.');
    }
}

