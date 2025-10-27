<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TechnologyTypeSeeder extends Seeder
{
    /**
     * Aggiorna la colonna type in base al title esistente.
     */
    public function run(): void
    {
        $map = [
            'Laravel'     => 'backend',
            'PostgreSQL'  => 'backend',
            'Docker'      => 'backend',
            'Angular'     => 'frontend',
            'Node.js'     => 'frontend',
        ];

        foreach ($map as $title => $type) {
            DB::table('technologies')->where('title', $title)->update(['type' => $type]);
        }
    }
}


