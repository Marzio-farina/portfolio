<?php

namespace App\Console\Commands;

use App\Models\Icon;
use Illuminate\Console\Command;

class ResetAvatarsToLocal extends Command
{
    protected $signature = 'avatars:reset-to-local';
    protected $description = 'Ripristina i path degli avatar per usare il backend locale';

    public function handle()
    {
        $this->info('Ripristino path avatar al backend locale...');

        // Avatar da reimpostare
        $avatars = [
            'avatar-1.png' => 'storage/avatars/avatar-1.png',
            'avatar-2.png' => 'storage/avatars/avatar-2.png',
            'avatar-3.png' => 'storage/avatars/avatar-3.png',
            'avatar-4.png' => 'storage/avatars/avatar-4.png',
            'avatar-5.png' => 'storage/avatars/avatar-5.png',
        ];

        $updated = 0;

        foreach ($avatars as $avatar => $localPath) {
            // Cerca l'icona per nome file
            $icon = Icon::where('img', 'like', "%$avatar")->first();
            
            if ($icon) {
                $oldPath = $icon->img;
                $icon->img = $localPath;
                $icon->save();
                $this->info("✓ Aggiornato: $oldPath -> $localPath");
                $updated++;
            } else {
                $this->warn("Nessun record trovato per: $avatar");
            }
        }

        $this->info("\nCompletato! Avatar aggiornati: $updated");
        return 0;
    }
}

