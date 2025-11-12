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
            // 2. Se oggi è già completo (nessuna nuova email), sincronizza il giorno più vecchio - 1
            
            $today = Carbon::now()->startOfDay();
            $targetDate = $today;
            
            // Trova il giorno più vecchio già sincronizzato
            $oldestSynced = JobOfferEmail::where('user_id', $user->id)
                ->orderBy('sent_at', 'asc')
                ->first();

            if ($oldestSynced) {
                $oldestDate = Carbon::parse($oldestSynced->sent_at)->startOfDay();
                
                // Prima controlla se ci sono email di OGGI
                $todayEmailsCount = JobOfferEmail::where('user_id', $user->id)
                    ->whereDate('sent_at', $today->format('Y-m-d'))
                    ->count();
                
                if ($todayEmailsCount > 0) {
                    // Oggi ha già email sincronizzate, passa al giorno PRIMA del più vecchio
                    $targetDate = $oldestDate->subDay();
                } else {
                    // Oggi non ha email, sincronizza OGGI
                    $targetDate = $today;
                }
            } else {
                // Nessuna email presente: inizia da OGGI
                $targetDate = $today;
            }

            $stats['synced_date'] = $targetDate->format('Y-m-d');

            Log::info("Sincronizzazione email per data: {$targetDate->format('Y-m-d')}", [
                'user_id' => $user->id,
                'oldest_synced' => $oldestSynced ? Carbon::parse($oldestSynced->sent_at)->format('Y-m-d') : 'none',
                'is_today' => $targetDate->isSameDay($today),
            ]);

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
                        
                        if ($this->isAlreadySynced($user->id, $messageId)) {
                            $stats['skipped']++;
                            continue;
                        }

                        // Importa l'email
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
        $direction = strtolower($folder) === 'sent' ? 'sent' : 'received';

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
                '{$direction}', '{$direction}', {$messageId}, {$sentAt}, NULL,
                {$hasBcc}::boolean, FALSE::boolean, FALSE::boolean, FALSE::boolean, FALSE::boolean,
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
     * Verifica se l'email è già stata sincronizzata
     */
    protected function isAlreadySynced(int $userId, ?string $messageId): bool
    {
        if (!$messageId) {
            return false;
        }

        return JobOfferEmail::where('user_id', $userId)
            ->where('message_id', $messageId)
            ->exists();
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

