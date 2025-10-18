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
        $icon      = Icon::firstOrCreate(['img' => 'icons/default.png'], ['alt' => 'Default']);

        User::updateOrCreate(
            ['email' => 'admin@marziofarina.it'],
            [
                'name' => 'Marzio',
                'surname' => 'Farina',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
                'icon_id' => $icon->id,
            ]
        );

        User::updateOrCreate(
            ['email' => 'dev@example.com'],
            [
                'name' => 'Laura',
                'surname' => 'Dev',
                'password' => Hash::make('password'),
                'role_id' => $devRole->id,
                'icon_id' => $icon->id,
            ]
        );
    }
}
