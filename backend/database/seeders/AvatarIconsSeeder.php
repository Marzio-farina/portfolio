<?php

namespace Database\Seeders;

use App\Models\Icon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AvatarIconsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $avatarIcons = [
            [
                'img' => 'storage/avatars/avatar-1.png',
                'alt' => 'Avatar 1',
                'type' => 'default'
            ],
            [
                'img' => 'storage/avatars/avatar-2.png',
                'alt' => 'Avatar 2',
                'type' => 'default'
            ],
            [
                'img' => 'storage/avatars/avatar-3.png',
                'alt' => 'Avatar 3',
                'type' => 'default'
            ],
            [
                'img' => 'storage/avatars/avatar-4.png',
                'alt' => 'Avatar 4',
                'type' => 'default'
            ],
            [
                'img' => 'storage/avatars/avatar-5.png',
                'alt' => 'Avatar 5',
                'type' => 'default'
            ],
            [
                'img' => 'storage/avatars/avatar-Cmg-cR76.png',
                'alt' => 'Avatar Personalizzato',
                'type' => 'default'
            ]
        ];

        foreach ($avatarIcons as $iconData) {
            // Controlla se l'icona esiste già
            $existingIcon = Icon::where('img', $iconData['img'])->first();
            
            if (!$existingIcon) {
                Icon::create($iconData);
                $this->command->info("Icona creata: {$iconData['img']}");
            } else {
                $this->command->info("Icona già esistente: {$iconData['img']}");
            }
        }
    }
}
