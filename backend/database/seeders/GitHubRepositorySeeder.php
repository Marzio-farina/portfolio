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
        // Assegna la repository GitHub all'utente principale (ID = 1)
        GitHubRepository::updateOrCreate(
            ['user_id' => 1],
            [
                'owner' => 'Marzio-farina',
                'repo' => 'portfolio',
                'url' => 'https://github.com/Marzio-farina/portfolio',
                'order' => 0,
            ]
        );

        $this->command->info('✅ Repository GitHub assegnata all\'utente ID=1');
    }
}

