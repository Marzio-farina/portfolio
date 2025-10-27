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
        Technology::insert([
            ['title' => 'Laravel',    'description' => 'Framework PHP full stack',       'type' => 'backend'],
            ['title' => 'Angular',    'description' => 'Frontend TypeScript',            'type' => 'frontend'],
            ['title' => 'Node.js',    'description' => 'Backend JavaScript',             'type' => 'frontend'],
            ['title' => 'PostgreSQL', 'description' => 'Database relazionale avanzato',  'type' => 'backend'],
            ['title' => 'Docker',     'description' => 'Containerizzazione e DevOps',    'type' => 'backend'],
        ]);
    }
}
