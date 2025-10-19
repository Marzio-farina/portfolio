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
        WhatIDo::insert([
            [
                'title' => 'Web Development',
                'description' => 'Siti e app web performanti con Laravel, Angular ed Electron',
                'icon' => 'code'
            ],
            [
                'title' => 'Windows Development',
                'description' => 'App desktop .NET e VBA per ottimizzare i processi aziendali',
                'icon' => 'pencil'
            ],
            [
                'title' => 'Web Scrapping & Automation',
                'description' => 'Automazione e raccolta dati dal web',
                'icon' => 'code'
            ],
            [
                'title' => 'UI/UX Design',
                'description' => 'Interfacce intuitive e curate per un\'esperienza ottimale',
                'icon' => 'pencil'
            ],
            [
                'title' => 'Ricerca e Innovazione',
                'description' => 'Sperimentazione continua di tecnologie e soluzioni nuove',
                'icon' => 'code'
            ],
            [
                'title' => 'Consulenza e Ottimizzazione',
                'description' => 'Analisi e software su misura per aumentare l’efficienza',
                'icon' => 'pencil'
            ],
        ]);
    }
}