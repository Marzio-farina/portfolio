<?php

namespace App\Console\Commands;

use App\Services\ICloudEmailService;
use Illuminate\Console\Command;

class ListICloudFolders extends Command
{
    protected $signature = 'emails:list-folders';
    protected $description = 'Elenca tutte le cartelle disponibili nell\'account iCloud';

    protected ICloudEmailService $emailService;

    public function __construct(ICloudEmailService $emailService)
    {
        parent::__construct();
        $this->emailService = $emailService;
    }

    public function handle(): int
    {
        $this->info("Connessione a iCloud IMAP...");
        
        if (!$this->emailService->connect()) {
            $this->error("Impossibile connettersi a iCloud!");
            return 1;
        }
        
        try {
            $client = (new \ReflectionClass($this->emailService))->getProperty('client');
            $client->setAccessible(true);
            $imapClient = $client->getValue($this->emailService);
            
            $folders = $imapClient->getFolders();
            
            $this->info("Cartelle disponibili:");
            $this->newLine();
            
            $tableData = [];
            foreach ($folders as $folder) {
                $tableData[] = [
                    $folder->name,
                    $folder->full_name ?? $folder->name,
                ];
            }
            
            $this->table(['Nome', 'Nome completo'], $tableData);
            
            $this->emailService->disconnect();
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error("Errore: " . $e->getMessage());
            return 1;
        }
    }
}

