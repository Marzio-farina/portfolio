<?php

namespace Database\Seeders;

use App\Models\Icon;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::where('title', 'Admin')->first();
        $devRole   = Role::where('title', 'Developer')->first();
        $icon      = Icon::inRandomOrder()->first();

        User::insert([
            [
                'name' => 'Marzio',
                'surname' => 'Farina',
                'email' => 'admin@marziofarina.it',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
                'icon_id' => $icon->id,
                'created_at' => now(),
            ],
            [
                'name' => 'Laura',
                'surname' => 'Dev',
                'email' => 'dev@example.com',
                'password' => Hash::make('password'),
                'role_id' => $devRole->id,
                'icon_id' => $icon->id,
                'created_at' => now(),
            ],
        ]);
    }
}
