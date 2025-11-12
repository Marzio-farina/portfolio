<?php

return [
    /*
    |--------------------------------------------------------------------------
    | iCloud IMAP Configuration
    |--------------------------------------------------------------------------
    */
    'accounts' => [
        'icloud' => [
            'host' => env('ICLOUD_IMAP_HOST', 'imap.mail.me.com'),
            'port' => env('ICLOUD_IMAP_PORT', 993),
            'encryption' => env('ICLOUD_IMAP_ENCRYPTION', 'ssl'),
            'validate_cert' => env('ICLOUD_IMAP_VALIDATE_CERT', true),
            'username' => env('ICLOUD_EMAIL'),
            'password' => env('ICLOUD_PASSWORD'),
            'protocol' => 'imap',
            'authentication' => null,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | SMTP Configuration per invio email
    |--------------------------------------------------------------------------
    */
    'smtp' => [
        'host' => env('ICLOUD_SMTP_HOST', 'smtp.mail.me.com'),
        'port' => env('ICLOUD_SMTP_PORT', 587),
        'encryption' => env('ICLOUD_SMTP_ENCRYPTION', 'tls'),
        'username' => env('ICLOUD_EMAIL'),
        'password' => env('ICLOUD_PASSWORD'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Opzioni di sincronizzazione
    |--------------------------------------------------------------------------
    */
    'sync' => [
        // Cartelle da sincronizzare
        // iCloud usa 'INBOX' per ricevute e 'Sent Messages' per inviate
        'folders' => ['INBOX', 'Sent Messages'],
        
        // Numero massimo di email da importare per volta
        'batch_size' => 100,
        
        // Sincronizza solo email degli ultimi X giorni
        'days_back' => 30,
        
        // Flag per identificare email già sincronizzate
        'synced_flag' => 'PORTFOLIO_SYNCED',
    ],
];

