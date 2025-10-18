<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Category::insert([
            ['title' => 'Web Development', 'description' => 'Siti, app e dashboard.'],
            ['title' => 'Game Dev', 'description' => 'Sviluppo giochi Unity.'],
            ['title' => 'AI & Automation', 'description' => 'Script intelligenti e automazioni.'],
        ]);
    }
}
