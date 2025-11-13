<?php

namespace App\Console\Commands;

use App\Models\JobOfferEmail;
use App\Models\User;
use Webklex\PHPIMAP\ClientManager;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SyncEmailsByDate extends Command
{
    protected $signature = 'emails:sync-by-date 
                            {--user-id=1 : ID dell\'utente}
                            {--folder=Deleted Messages : Nome della cartella da sincronizzare}
                            {--date=yesterday : Data da sincronizzare (yesterday, today, o formato YYYY-MM-DD)}';

    protected $description = 'Sincronizza email da una cartella specifica per una data specifica';

    public function handle(): int
    {
        $userId = $this->option('user-id');
        $folderName = $this->option('folder');
        $dateOption = $this->option('date');
        
        // Parse della data
        if ($dateOption === 'yesterday') {
            $targetDate = Carbon::yesterday();
        } elseif ($dateOption === 'today') {
            $targetDate = Carbon::today();
        } else {
            try {
                $targetDate = Carbon::parse($dateOption);
            } catch (\Exception $e) {
                $this->error("Formato data non valido: {$dateOption}");
                return 1;
            }
        }
        
        $this->info("===========================================");
        $this->info("Sincronizzazione email per data specifica");
        $this->info("===========================================");
        $this->info("User ID: {$userId}");
        $this->info("Cartella: {$folderName}");
        $this->info("Data: {$targetDate->format('Y-m-d')}");
        $this->newLine();
        
        $user = User::find($userId);
        
        if (!$user) {
            $this->error("Utente con ID {$userId} non trovato!");
            return 1;
        }
        
        $this->info("Utente: {$user->name} {$user->surname} ({$user->email})");
        $this->newLine();
        
        try {
            // Connetti a iCloud
            $cm = new ClientManager();
            $client = $cm->make([
                'host' => config('imap.accounts.icloud.host'),
                'port' => config('imap.accounts.icloud.port'),
                'encryption' => config('imap.accounts.icloud.encryption'),
                'validate_cert' => config('imap.accounts.icloud.validate_cert'),
                'username' => config('imap.accounts.icloud.username'),
                'password' => config('imap.accounts.icloud.password'),
                'protocol' => 'imap',
            ]);

            $client->connect();
            $this->info("✅ Connesso a iCloud IMAP");
            
            // Ottieni la cartella
            $folder = $client->getFolder($folderName);
            
            if (!$folder) {
                $this->error("Cartella '{$folderName}' non trovata!");
                $client->disconnect();
                return 1;
            }
            
            $this->info("✅ Cartella '{$folderName}' trovata");
            $this->newLine();
            
            // Query email per la data specifica
            $dateString = $targetDate->format('d-M-Y');
            $nextDay = $targetDate->copy()->addDay();
            $nextDayString = $nextDay->format('d-M-Y');
            
            $this->info("🔍 Ricerca email dal {$dateString} al {$nextDayString}...");
            
            $messages = $folder->query()
                ->since($dateString)
                ->before($nextDayString)
                ->get();
            
            $this->info("📧 Trovate {$messages->count()} email");
            $this->newLine();
            
            if ($messages->count() === 0) {
                $this->warn("Nessuna email trovata per questa data nella cartella {$folderName}");
                $client->disconnect();
                return 0;
            }
            
            $stats = ['imported' => 0, 'skipped' => 0, 'errors' => 0];
            
            // Progress bar
            $bar = $this->output->createProgressBar($messages->count());
            $bar->start();
            
            foreach ($messages as $message) {
                try {
                    $messageId = $message->getMessageId();
                    
                    // Verifica se esiste già
                    $existing = JobOfferEmail::where('user_id', $userId)
                        ->where('message_id', $messageId)
                        ->first();
                    
                    if ($existing) {
                        // Aggiorna i flag
                        $this->updateEmailFlags($existing, $folderName);
                        $stats['skipped']++;
                    } else {
                        // Importa nuova email
                        $this->importEmail($user, $message, $folderName);
                        $stats['imported']++;
                    }
                    
                    $bar->advance();
                    
                } catch (\Exception $e) {
                    $this->newLine();
                    $this->error("Errore: " . $e->getMessage());
                    $stats['errors']++;
                    $bar->advance();
                }
            }
            
            $bar->finish();
            $this->newLine();
            $this->newLine();
            
            $this->info("===========================================");
            $this->info("✅ Sincronizzazione completata!");
            $this->info("===========================================");
            
            $this->table(
                ['Statistica', 'Valore'],
                [
                    ['Nuove importate', $stats['imported']],
                    ['Aggiornate (già esistenti)', $stats['skipped']],
                    ['Errori', $stats['errors']],
                ]
            );
            
            $client->disconnect();
            return 0;
            
        } catch (\Exception $e) {
            $this->error("❌ Errore: " . $e->getMessage());
            Log::error('Sync by date failed', [
                'user_id' => $userId,
                'folder' => $folderName,
                'date' => $targetDate->format('Y-m-d'),
                'error' => $e->getMessage(),
            ]);
            return 1;
        }
    }

    protected function importEmail(User $user, $message, string $folder): void
    {
        $direction = strtolower($folder) === 'sent messages' ? 'sent' : 'received';
        $folderLower = strtolower($folder);
        
        $isJunk = $folderLower === 'junk';
        $isDeleted = $folderLower === 'deleted messages' || $folderLower === 'trash';
        $isArchived = $folderLower === 'archive';
        $isDraft = $folderLower === 'drafts';
        $status = $isDraft ? 'draft' : $direction;
        
        $isVip = false;
        try {
            $flags = $message->getFlags();
            $isVip = is_array($flags) && in_array('\\Flagged', $flags, true);
        } catch (\Exception $e) {
            // Ignora
        }

        $toRecipients = $this->extractAddresses($message->getTo());
        $ccRecipients = $this->extractAddresses($message->getCc());
        $bccRecipients = $this->extractAddresses($message->getBcc());

        $subject = DB::connection()->getPdo()->quote($this->sanitizeText($message->getSubject()));
        $preview = DB::connection()->getPdo()->quote($this->sanitizeText($this->getEmailPreview($message)));
        $fromAddress = DB::connection()->getPdo()->quote($message->getFrom()[0]->mail ?? '');
        $toJson = DB::connection()->getPdo()->quote(json_encode($toRecipients));
        $ccJson = DB::connection()->getPdo()->quote(json_encode($ccRecipients));
        $bccJson = DB::connection()->getPdo()->quote(json_encode($bccRecipients));
        $messageId = DB::connection()->getPdo()->quote($message->getMessageId());
        $sentAt = DB::connection()->getPdo()->quote($message->getDate());
        $hasBcc = !empty($bccRecipients) ? 'TRUE' : 'FALSE';
        $vipBool = $isVip ? 'TRUE' : 'FALSE';
        $junkBool = $isJunk ? 'TRUE' : 'FALSE';
        $deletedBool = $isDeleted ? 'TRUE' : 'FALSE';
        $archivedBool = $isArchived ? 'TRUE' : 'FALSE';
        
        DB::statement("
            INSERT INTO job_offer_emails (
                user_id, job_offer_id, subject, preview, from_address,
                to_recipients, cc_recipients, bcc_recipients,
                direction, status, message_id, sent_at, related_job_offer,
                has_bcc, is_vip, is_junk, is_deleted, is_archived,
                created_at, updated_at
            ) VALUES (
                {$user->id}, NULL, {$subject}, {$preview}, {$fromAddress},
                {$toJson}::jsonb, {$ccJson}::jsonb, {$bccJson}::jsonb,
                '{$direction}', '{$status}', {$messageId}, {$sentAt}, NULL,
                {$hasBcc}::boolean, {$vipBool}::boolean, {$junkBool}::boolean, {$deletedBool}::boolean, {$archivedBool}::boolean,
                NOW(), NOW()
            )
        ");
    }

    protected function updateEmailFlags(JobOfferEmail $email, string $folder): void
    {
        $folderLower = strtolower($folder);
        $updates = [];
        
        if ($folderLower === 'junk') {
            $updates['is_junk'] = true;
        } elseif ($folderLower === 'deleted messages' || $folderLower === 'trash') {
            $updates['is_deleted'] = true;
        } elseif ($folderLower === 'archive') {
            $updates['is_archived'] = true;
        } elseif ($folderLower === 'drafts') {
            $updates['status'] = 'draft';
        } else {
            $updates['is_junk'] = false;
            $updates['is_deleted'] = false;
        }
        
        if (!empty($updates)) {
            $email->update($updates);
        }
    }

    protected function extractAddresses($addresses): array
    {
        if (empty($addresses)) {
            return [];
        }

        $result = [];
        foreach ($addresses as $address) {
            if (isset($address->mail)) {
                $result[] = $address->mail;
            }
        }
        return $result;
    }

    protected function getEmailPreview($message): string
    {
        try {
            $body = $message->getTextBody() ?? '';
            if (empty($body)) {
                $body = strip_tags($message->getHTMLBody() ?? '');
            }
            return mb_substr($body, 0, 200);
        } catch (\Exception $e) {
            return '';
        }
    }

    protected function sanitizeText(?string $text): string
    {
        if (!$text) {
            return '';
        }
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);
        return trim($text);
    }
}

