<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\ICloudEmailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncSpecialFolders extends Command
{
    /**
     * Nome e firma del comando
     */
    protected $signature = 'emails:sync-special-folders {--user-id=1 : ID dell\'utente}';

    /**
     * Descrizione del comando
     */
    protected $description = 'Sincronizza email dalle cartelle speciali (Junk, Trash, Drafts, Archive)';

    protected ICloudEmailService $emailService;

    public function __construct(ICloudEmailService $emailService)
    {
        parent::__construct();
        $this->emailService = $emailService;
    }

    /**
     * Esegui il comando
     */
    public function handle(): int
    {
        $userId = $this->option('user-id');
        
        $this->info("===========================================");
        $this->info("Sincronizzazione cartelle speciali");
        $this->info("===========================================");
        $this->info("User ID: {$userId}");
        $this->newLine();
        
        $user = User::find($userId);
        
        if (!$user) {
            $this->error("Utente con ID {$userId} non trovato!");
            return 1;
        }
        
        $this->info("Utente: {$user->name} {$user->surname} ({$user->email})");
        $this->newLine();
        
        try {
            // Temporaneamente modifica la config per sincronizzare SOLO cartelle speciali
            config(['imap.sync.folders' => [
                'Junk',
                'Deleted Messages',
                'Drafts',
                'Archive',
            ]]);
            
            $this->info("🔄 Inizio sincronizzazione...");
            $this->newLine();
            
            // Esegui sincronizzazione
            $result = $this->emailService->syncEmailsForUser($user);
            
            $this->newLine();
            
            if ($result['success']) {
                $this->info("===========================================");
                $this->info("✅ Sincronizzazione completata con successo!");
                $this->info("===========================================");
                
                if (isset($result['stats'])) {
                    $stats = $result['stats'];
                    $this->table(
                        ['Statistica', 'Valore'],
                        [
                            ['Importate', $stats['imported']],
                            ['Saltate (già esistenti)', $stats['skipped']],
                            ['Errori', $stats['errors']],
                            ['Data sincronizzata', $stats['synced_date'] ?? 'N/A'],
                        ]
                    );
                }
                
                $this->newLine();
                $this->info("📊 Verifica i filtri nell'interfaccia web:");
                $this->info("   - Posta Indesiderata (Junk)");
                $this->info("   - Cestino (Deleted Messages)");
                $this->info("   - Bozze (Drafts)");
                $this->info("   - Archivio (Archive)");
                
                return 0;
            }
            
            $this->error("❌ Errore durante la sincronizzazione:");
            $this->error($result['message'] ?? 'Errore sconosciuto');
            return 1;
            
        } catch (\Exception $e) {
            $this->error("❌ Eccezione durante la sincronizzazione:");
            $this->error($e->getMessage());
            Log::error('Sync special folders failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }
}

