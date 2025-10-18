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
            ['title' => 'Web Developer', 'description' => 'Creo app moderne in Laravel e Angular.', 'icon' => 'code-slash'],
            ['title' => 'Game Developer', 'description' => 'Sviluppo esperienze in Unity 3D e C#.', 'icon' => 'gamepad'],
            ['title' => 'Automation Engineer', 'description' => 'Automazioni software con Node e Python.', 'icon' => 'cpu'],
        ]);
    }
}
