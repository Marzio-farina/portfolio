<?php

namespace App\Console\Commands;

use App\Models\Icon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class UploadAvatarsToSupabase extends Command
{
    protected $signature = 'avatars:upload-to-supabase';
    protected $description = 'Carica gli avatar esistenti su Supabase S3';

    public function handle()
    {
        if (!env('SUPABASE_S3_KEY') || !env('SUPABASE_S3_URL')) {
            $this->error('Supabase S3 non configurato. Controlla le variabili SUPABASE_S3_KEY e SUPABASE_S3_URL in .env');
            return 1;
        }

        $this->info('Caricamento avatar su Supabase S3...');

        // Avatar da caricare
        $avatars = [
            'avatar-1.png',
            'avatar-2.png',
            'avatar-3.png',
            'avatar-4.png',
            'avatar-5.png',
        ];

        $uploaded = 0;
        $errors = 0;

        foreach ($avatars as $avatar) {
            $localPath = storage_path('app/public/avatars/' . $avatar);
            
            if (!file_exists($localPath)) {
                $this->warn("Avatar non trovato: $avatar");
                $errors++;
                continue;
            }

            try {
                // Percorso su Supabase
                $supabasePath = 'avatars/' . $avatar;
                
                // Carica su Supabase S3
                Storage::disk('src')->put($supabasePath, file_get_contents($localPath));
                
                // Costruisci URL pubblico Supabase
                $supabaseUrl = rtrim(env('SUPABASE_S3_URL'), '/') . '/' . $supabasePath;
                
                // Aggiorna il database con l'URL Supabase
                $icon = Icon::where('img', 'like', "%$avatar")->first();
                if ($icon) {
                    $icon->img = $supabaseUrl;
                    $icon->save();
                    $this->info("✓ Aggiornato: $avatar -> $supabaseUrl");
                    $uploaded++;
                } else {
                    $this->warn("Nessun record trovato per: $avatar");
                }
                
            } catch (\Exception $e) {
                $this->error("Errore caricamento $avatar: " . $e->getMessage());
                $errors++;
            }
        }

        $this->info("\nCompletato! Upload riusciti: $uploaded, errori: $errors");
        return 0;
    }
}

