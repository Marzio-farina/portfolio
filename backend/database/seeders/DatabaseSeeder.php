<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        $this->call([
            RoleSeeder::class,
            IconSeeder::class,
            CategorySeeder::class,
            TechnologySeeder::class,
            UserSeeder::class,
            ProjectSeeder::class,
            CurriculumSeeder::class,
            TestimonialSeeder::class,
            WhatIDoSeeder::class,
            UserProfileAndSocialSeeder::class,
            AttestatiSeeder::class,
        ]);
    }
}
