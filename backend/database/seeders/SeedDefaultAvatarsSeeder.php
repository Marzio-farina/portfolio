<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SeedDefaultAvatarsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Inserisce i 5 avatar di default nella tabella icons.
     * Usare: php artisan db:seed --class=SeedDefaultAvatarsSeeder
     */
    public function run(): void
    {
        $avatars = [
            [
                'img' => 'storage/avatars/avatar-1.png',
                'alt' => 'Avatar 1',
                'type' => 'default',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'img' => 'storage/avatars/avatar-2.png',
                'alt' => 'Avatar 2',
                'type' => 'default',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'img' => 'storage/avatars/avatar-3.png',
                'alt' => 'Avatar 3',
                'type' => 'default',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'img' => 'storage/avatars/avatar-4.png',
                'alt' => 'Avatar 4',
                'type' => 'default',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'img' => 'storage/avatars/avatar-5.png',
                'alt' => 'Avatar 5',
                'type' => 'default',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        $inserted = 0;
        $updated = 0;

        foreach ($avatars as $avatar) {
            try {
                $result = DB::table('icons')->updateOrInsert(
                    ['img' => $avatar['img']],
                    $avatar
                );
                
                // Verifica se è stato inserito
                $exists = DB::table('icons')->where('img', $avatar['img'])->first();
                if ($exists) {
                    $updated++;
                    $this->command->info("✓ {$avatar['img']} - OK");
                } else {
                    $this->command->error("✗ {$avatar['img']} - FAILED");
                }
            } catch (\Exception $e) {
                $this->command->error("✗ Errore per {$avatar['img']}: {$e->getMessage()}");
            }
        }

        // Verifica finale
        $totalIcons = DB::table('icons')->where('type', 'default')->where('img', 'like', 'storage/avatars%')->count();
        $this->command->info("✅ Total avatar inseriti: $totalIcons");
    }
}
