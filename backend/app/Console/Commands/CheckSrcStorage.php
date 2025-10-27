<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CheckSrcStorage extends Command
{
    protected $signature = 'app:check-storage-src';
    protected $description = 'Verifica connessione e permessi del disco src (Supabase S3).';

    public function handle(): int
    {
        $this->info('Verifica configurazione disco "src" (Supabase).');

        $endpoint = env('SUPABASE_S3_ENDPOINT');
        $bucket   = env('SUPABASE_S3_BUCKET');
        $pubUrl   = config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL');

        $this->line('Endpoint: ' . ($endpoint ?: 'MANCANTE'));
        $this->line('Bucket:   ' . ($bucket ?: 'MANCANTE'));
        $this->line('Public URL: ' . ($pubUrl ?: 'MANCANTE'));

        try {
            $key = 'avatars/_healthcheck_' . uniqid() . '.txt';
            Storage::disk('src')->put($key, 'ok');
            $this->info('✓ Scrittura riuscita: ' . $key);

            $exists = Storage::disk('src')->exists($key);
            $this->info('✓ Exists: ' . ($exists ? 'true' : 'false'));

            Storage::disk('src')->delete($key);
            $this->info('✓ Cleanup riuscito');

            if ($pubUrl) {
                $this->line('URL atteso: ' . rtrim($pubUrl, '/') . '/' . $key);
            }

            $this->info('Verifica completata.');
            return 0;
        } catch (\Throwable $e) {
            $this->error('Errore: ' . $e->getMessage());
            return 1;
        }
    }
}


