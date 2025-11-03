<?php

namespace Database\Seeders;

use App\Models\Technology;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TechnologySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $technologies = [
            // Tecnologie specifiche User 1 (Marzio)
            ['title' => 'Laravel',    'description' => 'Framework PHP full stack',        'type' => 'backend',   'user_id' => 1],
            ['title' => 'Angular',    'description' => 'Framework frontend TypeScript',   'type' => 'frontend',  'user_id' => 1],
            ['title' => 'Node.js',    'description' => 'Runtime JavaScript backend',      'type' => 'backend',   'user_id' => 1],
            ['title' => 'Vue.js',     'description' => 'Framework frontend progressivo',  'type' => 'frontend',  'user_id' => 1],
            ['title' => 'React',      'description' => 'Libreria UI component-based',     'type' => 'frontend',  'user_id' => 1],
            ['title' => 'TailwindCSS','description' => 'Framework CSS utility-first',     'type' => 'frontend',  'user_id' => 1],
            ['title' => 'Bootstrap',  'description' => 'Framework CSS responsive',        'type' => 'frontend',  'user_id' => 1],
            ['title' => 'Supabase',   'description' => 'Backend as a Service',            'type' => 'backend',   'user_id' => 1],
            ['title' => 'Firebase',   'description' => 'Platform Google cloud',           'type' => 'backend',   'user_id' => 1],
            ['title' => 'Chart.js',   'description' => 'Libreria grafici JavaScript',     'type' => 'frontend',  'user_id' => 1],
            ['title' => 'RxJS',       'description' => 'Programmazione reattiva',         'type' => 'frontend',  'user_id' => 1],
        ];

        Technology::insert($technologies);
    }
}
