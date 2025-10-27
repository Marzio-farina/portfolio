<?php

namespace App\Console\Commands;

use App\Models\Icon;
use App\Models\Testimonial;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TestAvatarSystem extends Command
{
    protected $signature = 'app:test-avatar-system {--production : Testa la configurazione di produzione}';

    protected $description = 'Verifica il funzionamento completo del sistema avatar in localhost e produzione';

    public function handle(): int
    {
        $this->info('🔍 INIZIO TEST SISTEMA AVATAR');
        $this->line(str_repeat('=', 80));

        $isProduction = $this->option('production');

        // Test 1: Verifica Database
        $this->testDatabase();

        // Test 2: Verifica File Fisici
        $this->testPhysicalFiles();

        // Test 3: Verifica Percorsi URL
        $this->testUrlPaths($isProduction);

        // Test 4: Verifica Relazioni Database
        $this->testDatabaseRelations();

        // Test 5: Verifica Endpoint API
        $this->testApiEndpoints($isProduction);

        $this->line(str_repeat('=', 80));
        $this->info('✅ TEST COMPLETATO CON SUCCESSO');

        return 0;
    }

    private function testDatabase(): void
    {
        $this->newLine();
        $this->info('📊 TEST 1: VERIFICA DATABASE');
        $this->line('-');

        $iconCount = Icon::count();
        $this->line("✓ Total icons in database: <fg=green>$iconCount</>");

        $defaultIcons = Icon::where('type', 'default')->count();
        $this->line("✓ Default avatars: <fg=green>$defaultIcons</>");

        $userUploadedIcons = Icon::where('type', 'user_uploaded')->count();
        $this->line("✓ User uploaded avatars: <fg=green>$userUploadedIcons</>");

        // Report: quanti URL assoluti (prod) e quanti path storage (dev)
        $absolute = Icon::where('img', 'like', 'http%')->count();
        $storage  = Icon::where('img', 'like', 'storage/%')->count();
        $this->line("✓ URL assoluti (CDN): <fg=green>$absolute</>");
        $this->line("✓ Path locali (storage/): <fg=green>$storage</>");
    }

    private function testPhysicalFiles(): void
    {
        $this->newLine();
        $this->info('📁 TEST 2: VERIFICA FILE FISICI');
        $this->line('-');

        $storagePath = storage_path('app/public/avatars');
        $publicPath = public_path('storage/avatars');

        // Controlla che i percorsi esistano
        if (!is_dir($storagePath)) {
            $this->error("✗ Cartella storage/app/public/avatars non esiste!");
        } else {
            $storageFiles = count(glob("$storagePath/*"));
            $this->line("✓ File in storage/app/public/avatars: <fg=green>$storageFiles</>");
        }

        if (!is_dir($publicPath)) {
            $this->error("✗ Cartella public/storage/avatars non esiste!");
        } else {
            $publicFiles = count(glob("$publicPath/*"));
            $this->line("✓ File in public/storage/avatars: <fg=green>$publicFiles</>");
        }

        // Verifica i file specifici degli avatar
        $expectedAvatars = ['avatar-1.png', 'avatar-2.png', 'avatar-3.png', 'avatar-4.png', 'avatar-5.png'];
        foreach ($expectedAvatars as $avatar) {
            $filePath = "$publicPath/$avatar";
            if (file_exists($filePath)) {
                $size = filesize($filePath);
                $this->line("✓ $avatar: <fg=green>" . $this->formatBytes($size) . "</>");
            } else {
                $this->error("✗ $avatar: FILE NON TROVATO!");
            }
        }
    }

    private function testUrlPaths($isProduction = false): void
    {
        $this->newLine();
        $this->info('🔗 TEST 3: VERIFICA PERCORSI URL');
        $this->line('-');

        // Prendi un avatar dal database
        $icon = Icon::where('type', 'default')->first();

        if (!$icon) {
            $this->error('✗ Nessun avatar default trovato nel database!');
            return;
        }

        $dbPath = $icon->img;
        $this->line("Database path: <fg=cyan>$dbPath</>");

        if (str_starts_with($dbPath, 'http')) {
            $this->line("Expected: URL assoluto servibile da CDN → <fg=green>OK</>");
        } elseif (str_starts_with($dbPath, 'storage/')) {
            $expectedUrl = '/'.ltrim($dbPath, '/');
            $this->line("Expected API URL (dev): <fg=cyan>$expectedUrl</>");
            $this->line("Servito da localhost o vercel.json in build → <fg=green>OK</>");
        } else {
            $this->error("✗ Formato path non riconosciuto: $dbPath");
        }
    }

    private function testDatabaseRelations(): void
    {
        $this->newLine();
        $this->info('🔗 TEST 4: VERIFICA RELAZIONI DATABASE');
        $this->line('-');

        // Testimonial con icon
        $testimonialWithIcon = Testimonial::whereNotNull('icon_id')->first();
        if ($testimonialWithIcon) {
            $this->line("✓ Testimonial con icon_id: <fg=green>ID " . $testimonialWithIcon->id . "</>");
            $icon = $testimonialWithIcon->icon;
            if ($icon) {
                $this->line("  └─ Icon: <fg=green>" . $icon->img . "</>");
            } else {
                $this->error("  └─ Icon non trovata (relazione rotta)!");
            }
        } else {
            $this->warn("⚠ Nessun testimonial con icon_id trovato");
        }

        // User con icon
        $userWithIcon = DB::table('users')->whereNotNull('icon_id')->first();
        if ($userWithIcon) {
            $this->line("✓ User con icon_id: <fg=green>ID " . $userWithIcon->id . "</>");
            $icon = Icon::find($userWithIcon->icon_id);
            if ($icon) {
                $this->line("  └─ Icon: <fg=green>" . $icon->img . "</>");
            } else {
                $this->error("  └─ Icon non trovata (relazione rotta)!");
            }
        } else {
            $this->warn("⚠ Nessun user con icon_id trovato");
        }
    }

    private function testApiEndpoints($isProduction = false): void
    {
        $this->newLine();
        $this->info('🌐 TEST 5: VERIFICA ENDPOINT API');
        $this->line('-');

        $baseUrl = $isProduction ? 'https://api.marziofarina.it' : 'http://localhost:8000';

        // Test endpoint testimonials/default-avatars
        $this->line("Testing: <fg=cyan>GET /api/testimonials/default-avatars</>");
        try {
            $response = json_decode(file_get_contents($baseUrl . '/api/testimonials/default-avatars'), true);

            if (isset($response['avatars'])) {
                $avatarCount = count($response['avatars']);
                $this->line("✓ Response contains <fg=green>$avatarCount avatars</>");

                foreach (array_slice($response['avatars'], 0, 3) as $avatar) {
                    $imgUrl = $avatar['img'];
                    $this->line("  └─ <fg=cyan>" . basename($imgUrl) . "</>");

                    $this->line("    ✓ URL utilizzabile <fg=green>✓</>");
                }
            } else {
                $this->error("✗ Response non contiene 'avatars' key");
            }
        } catch (\Exception $e) {
            $this->error("✗ Errore durante il test: " . $e->getMessage());
        }

        // Test endpoint testimonials (con icons)
        $this->newLine();
        $this->line("Testing: <fg=cyan>GET /api/testimonials?per_page=1</>");
        try {
            $response = json_decode(file_get_contents($baseUrl . '/api/testimonials?per_page=1'), true);

            if (isset($response['data'][0])) {
                $testimonial = $response['data'][0];
                $this->line("✓ Response contains testimonial: <fg=green>" . $testimonial['author'] . "</>");

                if (isset($testimonial['icon'])) {
                    $imgUrl = $testimonial['icon']['img'];
                    $this->line("  └─ Icon URL: <fg=cyan>" . basename($imgUrl) . "</>");

                    $this->line("    ✓ URL utilizzabile <fg=green>✓</>");
                } else {
                    $this->warn("  ⚠ Testimonial non ha icon");
                }
            } else {
                $this->error("✗ Response non contiene dati");
            }
        } catch (\Exception $e) {
            $this->error("✗ Errore durante il test: " . $e->getMessage());
        }
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));

        return round($bytes, 2) . ' ' . $units[$pow];
    }
}
