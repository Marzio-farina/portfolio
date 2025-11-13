<?php

namespace App\Services;

use App\Models\JobOfferEmail;
use App\Models\User;
use Webklex\PHPIMAP\ClientManager;
use Webklex\PHPIMAP\Client;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ICloudEmailService
{
    protected Client $client;
    protected array $config;

    public function __construct()
    {
        $this->config = config('imap');
    }

    /**
     * Connetti al server iCloud IMAP
     */
    public function connect(): bool
    {
        try {
            $cm = new ClientManager();
            $this->client = $cm->make([
                'host' => $this->config['accounts']['icloud']['host'],
                'port' => $this->config['accounts']['icloud']['port'],
                'encryption' => $this->config['accounts']['icloud']['encryption'],
                'validate_cert' => $this->config['accounts']['icloud']['validate_cert'],
                'username' => $this->config['accounts']['icloud']['username'],
                'password' => $this->config['accounts']['icloud']['password'],
                'protocol' => $this->config['accounts']['icloud']['protocol'],
            ]);

            $this->client->connect();
            
            Log::info('Connessione iCloud IMAP stabilita con successo');
            return true;
        } catch (\Exception $e) {
            Log::error('Errore connessione iCloud IMAP', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Sincronizza le email per un utente specifico
     * Strategia: sincronizza un giorno alla volta, partendo da oggi e andando indietro
     */
    public function syncEmailsForUser(User $user): array
    {
        if (!$this->connect()) {
            return [
                'success' => false,
                'message' => 'Impossibile connettersi al server iCloud'
            ];
        }

        $stats = [
            'imported' => 0,
            'skipped' => 0,
            'errors' => 0,
            'synced_date' => null,
        ];

        try {
            $folders = $this->config['sync']['folders'];
            $batchSize = $this->config['sync']['batch_size'];

            // Determina quale giorno sincronizzare
            // Strategia OTTIMIZZATA:
            // 1. Controlla SEMPRE oggi per nuove email
            // 2. Se oggi è già completo, sincronizza giorni precedenti
            // 3. Se un giorno non ha email, continua automaticamente con i giorni precedenti
            
            $today = Carbon::now()->startOfDay();
            $targetDate = $today;
            $maxDaysToCheck = 10; // Controlla max 10 giorni vuoti prima di fermarsi
            
            // Trova il giorno più vecchio già sincronizzato
            $oldestSynced = JobOfferEmail::where('user_id', $user->id)
                ->orderBy('sent_at', 'asc')
                ->first();

            if ($oldestSynced) {
                $oldestDate = Carbon::parse($oldestSynced->sent_at)->startOfDay();
                
                // Prima controlla se ci sono email di OGGI nel DB
                $todayEmailsCount = JobOfferEmail::where('user_id', $user->id)
                    ->whereDate('sent_at', $today->format('Y-m-d'))
                    ->count();
                
                if ($todayEmailsCount > 0) {
                    // Oggi ha già email, passa al giorno PRIMA del più vecchio
                    $targetDate = $oldestDate->subDay();
                } else {
                    // Oggi non ha email, sincronizza OGGI
                    $targetDate = $today;
                }
            } else {
                // Nessuna email presente: inizia da OGGI
                $targetDate = $today;
            }

            // LOOP: Se un giorno è vuoto, continua automaticamente con i giorni precedenti
            $daysChecked = 0;
            $foundEmails = false;

            while (!$foundEmails && $daysChecked < $maxDaysToCheck) {
                $stats['synced_date'] = $targetDate->format('Y-m-d');

                Log::info("Tentativo sincronizzazione per data: {$targetDate->format('Y-m-d')}", [
                    'user_id' => $user->id,
                    'attempt' => $daysChecked + 1,
                ]);

                $dailyImported = 0;

                foreach ($folders as $folderName) {
                $folder = $this->client->getFolder($folderName);
                
                if (!$folder) {
                    Log::warning("Cartella {$folderName} non trovata");
                    continue;
                }

                // Query OTTIMIZZATA: leggi SOLO le email del giorno specifico
                $dateString = $targetDate->format('d M Y');
                $nextDayString = $targetDate->copy()->addDay()->format('d M Y');

                // IMAP: since = dal giorno X, before = prima del giorno Y
                // Per ottenere SOLO il giorno X: since X AND before (X+1)
                $messages = $folder->query()
                    ->since($dateString)
                    ->before($nextDayString)
                    ->get();

                Log::info("Query IMAP per {$folderName} per il {$dateString}: trovate {$messages->count()} email");

                $importedInFolder = 0;

                foreach ($messages as $message) {
                    try {
                        // Verifica che l'email sia effettivamente del giorno corretto
                        $emailDate = Carbon::parse($message->getDate());
                        if (!$emailDate->isSameDay($targetDate)) {
                            Log::debug("Email fuori range: {$emailDate->format('Y-m-d')} != {$targetDate->format('Y-m-d')}");
                            continue; // Salta email di altri giorni
                        }

                        // Verifica se l'email è già stata sincronizzata
                        $messageId = $message->getMessageId();
                        
                        $existingEmail = $this->findExistingEmail($user->id, $messageId);
                        
                        if ($existingEmail) {
                            // Aggiorna i flag dell'email esistente in base alla cartella corrente
                            $this->updateEmailFlags($existingEmail, $folderName);
                            $stats['skipped']++;
                            continue;
                        }

                        // Importa la nuova email
                        $this->importEmail($user, $message, $folderName);
                        $stats['imported']++;
                        $importedInFolder++;

                        // Interrompi quando hai importato 100 email (limite batch)
                        if ($importedInFolder >= $batchSize) {
                            Log::info("Raggiunto limite batch di {$batchSize} email per cartella {$folderName}");
                            break;
                        }

                    } catch (\Exception $e) {
                        Log::error('Errore importazione singola email', [
                            'user_id' => $user->id,
                            'message_id' => $messageId ?? 'unknown',
                            'error' => $e->getMessage()
                        ]);
                        $stats['errors']++;
                    }
                }

                $dailyImported += $importedInFolder;
            }

            // Se questo giorno ha importato email, fermati
            if ($dailyImported > 0 || $stats['skipped'] > 0) {
                $foundEmails = true;
                Log::info("Trovate email per {$targetDate->format('Y-m-d')}: importate={$dailyImported}, saltate={$stats['skipped']}");
            } else {
                // Nessuna email per questo giorno, passa al precedente
                $daysChecked++;
                if ($daysChecked < $maxDaysToCheck) {
                    Log::info("Nessuna email per {$targetDate->format('Y-m-d')}, passo al giorno precedente");
                    $targetDate = $targetDate->subDay();
                }
            }
        }

        if (!$foundEmails && $daysChecked >= $maxDaysToCheck) {
            Log::warning("Raggiunto limite di {$maxDaysToCheck} giorni vuoti consecutivi");
        }

            return [
                'success' => true,
                'stats' => $stats
            ];

        } catch (\Exception $e) {
            Log::error('Errore sincronizzazione email', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'stats' => $stats
            ];
        } finally {
            $this->disconnect();
        }
    }

    /**
     * Importa una singola email nel database
     */
    protected function importEmail(User $user, $message, string $folder): void
    {
        // Determina direzione (sent/received)
        $direction = strtolower($folder) === 'sent messages' ? 'sent' : 'received';

        // Determina categorie in base alla cartella
        $folderLower = strtolower($folder);
        $isJunk = $folderLower === 'junk';
        $isDeleted = $folderLower === 'deleted messages' || $folderLower === 'trash';
        $isArchived = $folderLower === 'archive';
        $isDraft = $folderLower === 'drafts';
        
        // Determina lo status
        $status = $isDraft ? 'draft' : $direction;

        // Determina se è VIP controllando i flag del messaggio
        $isVip = false;
        try {
            $flags = $message->getFlags();
            $isVip = is_array($flags) && in_array('\\Flagged', $flags, true);
        } catch (\Exception $e) {
            // Se non riusciamo a leggere i flag, continua senza VIP
            Log::debug('Impossibile leggere flag VIP per email: ' . $e->getMessage());
        }

        // Estrai destinatari
        $toRecipients = $this->extractAddresses($message->getTo());
        $ccRecipients = $this->extractAddresses($message->getCc());
        $bccRecipients = $this->extractAddresses($message->getBcc());

        // Crea record nel database con SQL raw per gestire correttamente i boolean PostgreSQL
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

    /**
     * Estrai indirizzi email da oggetti Address
     */
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

    /**
     * Ottieni preview del corpo email
     */
    protected function getEmailPreview($message): string
    {
        try {
            $body = $message->getTextBody() ?? $message->getHTMLBody() ?? '';
            
            // Rimuovi tag HTML se presente
            $body = strip_tags($body);
            
            // Prendi i primi 200 caratteri
            return substr($body, 0, 200);
        } catch (\Exception $e) {
            return '';
        }
    }

    /**
     * Sanitizza il testo rimuovendo caratteri problematici per UTF8
     */
    protected function sanitizeText(?string $text): string
    {
        if (!$text) {
            return '';
        }

        // Rimuovi emoji e caratteri speciali che causano problemi con PostgreSQL UTF8
        $text = preg_replace('/[\x{1F600}-\x{1F64F}]/u', '', $text); // Emoticons
        $text = preg_replace('/[\x{1F300}-\x{1F5FF}]/u', '', $text); // Misc Symbols and Pictographs
        $text = preg_replace('/[\x{1F680}-\x{1F6FF}]/u', '', $text); // Transport and Map
        $text = preg_replace('/[\x{2600}-\x{26FF}]/u', '', $text); // Misc symbols
        $text = preg_replace('/[\x{2700}-\x{27BF}]/u', '', $text); // Dingbats
        $text = preg_replace('/[\x{1F900}-\x{1F9FF}]/u', '', $text); // Supplemental Symbols and Pictographs
        
        // Pulisci eventuali caratteri null o di controllo
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);
        
        return trim($text);
    }

    /**
     * Trova un'email esistente per message_id
     */
    protected function findExistingEmail(int $userId, ?string $messageId): ?JobOfferEmail
    {
        if (!$messageId) {
            return null;
        }

        return JobOfferEmail::where('user_id', $userId)
            ->where('message_id', $messageId)
            ->first();
    }

    /**
     * Aggiorna i flag di un'email esistente in base alla cartella
     */
    protected function updateEmailFlags(JobOfferEmail $email, string $folder): void
    {
        $folderLower = strtolower($folder);
        
        // Determina i nuovi flag in base alla cartella
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
            // Se l'email è tornata in INBOX o Sent, resetta i flag negativi
            $updates['is_junk'] = false;
            $updates['is_deleted'] = false;
        }
        
        // Aggiorna se ci sono modifiche
        if (!empty($updates)) {
            $email->update($updates);
            Log::info("Email {$email->id} aggiornata: cartella {$folder}");
        }
    }

    /**
     * Disconnetti dal server
     */
    public function disconnect(): void
    {
        try {
            if (isset($this->client)) {
                $this->client->disconnect();
            }
        } catch (\Exception $e) {
            Log::warning('Errore disconnessione iCloud', [
                'error' => $e->getMessage()
            ]);
        }
    }
}

