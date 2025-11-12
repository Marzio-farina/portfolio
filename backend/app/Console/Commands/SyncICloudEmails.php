<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ICloudEmailService;
use App\Models\User;

class SyncICloudEmails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'icloud:sync-emails 
                            {--user= : ID specifico utente da sincronizzare}
                            {--all : Sincronizza tutti gli utenti}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincronizza email da iCloud nel database';

    protected ICloudEmailService $emailService;

    public function __construct(ICloudEmailService $emailService)
    {
        parent::__construct();
        $this->emailService = $emailService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔄 Inizio sincronizzazione email iCloud...');
        $this->newLine();

        try {
            // Determina quali utenti sincronizzare
            $users = $this->getUsersToSync();

            if ($users->isEmpty()) {
                $this->error('❌ Nessun utente trovato da sincronizzare');
                return Command::FAILURE;
            }

            $this->info("📧 Sincronizzazione di {$users->count()} utente/i");
            $this->newLine();

            $progressBar = $this->output->createProgressBar($users->count());
            $progressBar->start();

            $totalStats = [
                'imported' => 0,
                'skipped' => 0,
                'errors' => 0,
            ];

            foreach ($users as $user) {
                $this->line("Sincronizzazione email per: {$user->name} ({$user->email})");
                
                $result = $this->emailService->syncEmailsForUser($user);

                if ($result['success']) {
                    $stats = $result['stats'];
                    $totalStats['imported'] += $stats['imported'];
                    $totalStats['skipped'] += $stats['skipped'];
                    $totalStats['errors'] += $stats['errors'];

                    $this->info("  ✓ Importate: {$stats['imported']} | Saltate: {$stats['skipped']} | Errori: {$stats['errors']}");
                } else {
                    $this->error("  ✗ Errore: {$result['message']}");
                }

                $progressBar->advance();
            }

            $progressBar->finish();
            $this->newLine(2);

            // Riepilogo finale
            $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            $this->info('📊 RIEPILOGO SINCRONIZZAZIONE');
            $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            $this->table(
                ['Metrica', 'Valore'],
                [
                    ['Email importate', $totalStats['imported']],
                    ['Email saltate (già esistenti)', $totalStats['skipped']],
                    ['Errori', $totalStats['errors']],
                ]
            );

            if ($totalStats['errors'] > 0) {
                $this->warn('⚠️  Controlla i log per dettagli sugli errori');
            }

            $this->newLine();
            $this->info('✅ Sincronizzazione completata!');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Errore durante la sincronizzazione:');
            $this->error($e->getMessage());
            $this->newLine();
            $this->error('Stack trace: ' . $e->getTraceAsString());
            
            return Command::FAILURE;
        }
    }

    /**
     * Ottieni gli utenti da sincronizzare
     */
    protected function getUsersToSync()
    {
        // Opzione --user=ID
        if ($userId = $this->option('user')) {
            return User::where('id', $userId)->get();
        }

        // Opzione --all
        if ($this->option('all')) {
            return User::all();
        }

        // Default: utente autenticato corrente (se disponibile)
        // In alternativa, chiedi conferma interattiva
        if ($this->confirm('Vuoi sincronizzare tutti gli utenti?', false)) {
            return User::all();
        }

        // Se nessuna opzione, mostra help
        $this->warn('Specifica un utente con --user=ID oppure usa --all per tutti');
        return collect();
    }
}
