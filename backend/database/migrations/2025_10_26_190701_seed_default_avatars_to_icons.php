<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Inserisce i 5 avatar di default nella tabella icons.
     * Usa INSERT OR IGNORE per evitare duplicati.
     */
    public function up(): void
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

        foreach ($avatars as $avatar) {
            // Usa firstOrCreate per evitare duplicati
            DB::table('icons')->updateOrInsert(
                ['img' => $avatar['img']],
                $avatar
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rimuovi solo gli avatar di default
        DB::table('icons')
            ->where('type', 'default')
            ->where('img', 'like', 'storage/avatars/avatar-%.png')
            ->delete();
    }
};
