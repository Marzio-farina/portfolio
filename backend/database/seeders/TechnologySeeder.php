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
            ['title' => 'Laravel', 'description' => 'Framework PHP full stack'],
            ['title' => 'Angular', 'description' => 'Frontend TypeScript'],
            ['title' => 'Node.js', 'description' => 'Backend JavaScript'],
            ['title' => 'PostgreSQL', 'description' => 'Database relazionale avanzato'],
            ['title' => 'Docker', 'description' => 'Containerizzazione e DevOps'],
        ]);
    }
}
