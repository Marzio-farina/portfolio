<?php

namespace Database\Seeders;

use App\Models\Icon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class IconSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Icon::insert([
            ['img' => 'icons/user1.png', 'alt' => 'User Icon 1'],
            ['img' => 'icons/user2.png', 'alt' => 'User Icon 2'],
            ['img' => 'icons/user3.png', 'alt' => 'User Icon 3'],
        ]);
    }
}
