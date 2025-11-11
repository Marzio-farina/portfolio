<?php

namespace Database\Seeders;

use App\Models\WhatIDo;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class WhatIDoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Assegna tutte le card "What I Do" all'utente principale (ID = 1)
        WhatIDo::insert([
            [
                'user_id' => 1,
                'title' => 'Web Development',
                'description' => 'Siti e app web performanti con Laravel, Angular ed Electron',
                'icon' => 'web-development'
            ],
            [
                'user_id' => 1,
                'title' => 'Windows Development',
                'description' => 'App desktop .NET e VBA per ottimizzare i processi aziendali',
                'icon' => 'mobile-development'
            ],
            [
                'user_id' => 1,
                'title' => 'Web Scrapping & Automation',
                'description' => 'Automazione e raccolta dati dal web',
                'icon' => 'api'
            ],
            [
                'user_id' => 1,
                'title' => 'UI/UX Design',
                'description' => "Interfacce intuitive e curate per un'esperienza ottimale",
                'icon' => 'design'
            ],
            [
                'user_id' => 1,
                'title' => 'Ricerca e Innovazione',
                'description' => 'Sperimentazione continua di tecnologie e soluzioni nuove',
                'icon' => 'analytics'
            ],
            [
                'user_id' => 1,
                'title' => 'Consulenza e Ottimizzazione',
                'description' => "Analisi e software su misura per aumentare l'efficienza",
                'icon' => 'support'
            ],
        ]);
    }
}