# 📧 Guida Configurazione iCloud Email Sync

## 🔐 Prerequisiti

### 1. Genera Password Specifica per App su iCloud

1. Vai su [appleid.apple.com](https://appleid.apple.com)
2. Accedi con il tuo Apple ID
3. Nella sezione **Sicurezza**, trova **Password specifiche per le app**
4. Clicca su **Genera password**
5. Dai un nome (es: "Portfolio Laravel")
6. **Copia e salva la password generata** (servirà per il file `.env`)

### 2. Configura il file `.env`

Aggiungi queste righe al tuo file `.env`:

```env
# iCloud Email Configuration
ICLOUD_EMAIL=tua-email@icloud.com
ICLOUD_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Password specifica generata
ICLOUD_IMAP_HOST=imap.mail.me.com
ICLOUD_IMAP_PORT=993
ICLOUD_IMAP_ENCRYPTION=ssl
ICLOUD_IMAP_VALIDATE_CERT=true
ICLOUD_SMTP_HOST=smtp.mail.me.com
ICLOUD_SMTP_PORT=587
ICLOUD_SMTP_ENCRYPTION=tls
```

## 🚀 Utilizzo

### Opzione 1: Command Line (Artisan)

#### Sincronizza tutti gli utenti:
```bash
php artisan icloud:sync-emails --all
```

#### Sincronizza un utente specifico:
```bash
php artisan icloud:sync-emails --user=1
```

#### Modalità interattiva:
```bash
php artisan icloud:sync-emails
```

### Opzione 2: API Endpoint (dal Frontend)

#### Test connessione iCloud:
```javascript
POST /api/emails/test-connection
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Connessione iCloud stabilita con successo"
}
```

#### Sincronizza email utente corrente:
```javascript
POST /api/emails/sync
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Sincronizzazione completata con successo",
  "stats": {
    "imported": 15,
    "skipped": 3,
    "errors": 0
  }
}
```

## ⚙️ Configurazione Avanzata

### File: `config/imap.php`

```php
'sync' => [
    // Cartelle da sincronizzare
    'folders' => ['INBOX', 'Sent'],
    
    // Numero massimo di email da importare per volta
    'batch_size' => 50,
    
    // Sincronizza solo email degli ultimi X giorni
    'days_back' => 30,
],
```

## 🔄 Automazione (Cron Job)

Aggiungi al tuo `app/Console/Kernel.php`:

```php
protected function schedule(Schedule $schedule)
{
    // Sincronizza ogni ora
    $schedule->command('icloud:sync-emails --all')
             ->hourly()
             ->withoutOverlapping();
    
    // Oppure ogni giorno alle 2:00
    $schedule->command('icloud:sync-emails --all')
             ->dailyAt('02:00');
}
```

Attiva il cron sul server:
```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

## 📊 Monitoraggio

I log sono salvati in `storage/logs/laravel.log`:

```bash
tail -f storage/logs/laravel.log | grep "iCloud"
```

## 🐛 Troubleshooting

### Errore: "Can't connect to imap.mail.me.com"
- ✅ Verifica che la password specifica per app sia corretta
- ✅ Controlla che l'autenticazione a 2 fattori sia attiva su iCloud
- ✅ Verifica che PHP abbia l'estensione IMAP installata

### Errore: "Authentication failed"
- ✅ Rigenera una nuova password specifica per app
- ✅ Assicurati di usare l'email completa (es: `nome@icloud.com`, non solo `nome`)

### Email duplicate
Le email vengono identificate tramite `message_id` univoco, quindi non dovrebbero duplicarsi. Se succede, controlla che il campo `message_id` nella tabella `job_offer_emails` sia popolato correttamente.

## 🎯 Prossimi Passi

1. ✅ **Test iniziale**: Esegui `php artisan icloud:sync-emails --user=1`
2. ⚡ **Frontend**: Aggiungi un pulsante "Sincronizza Email" che chiama l'API
3. 🔗 **Matching automatico**: Implementa la logica per collegare automaticamente le email alle job offers
4. 📧 **Invio email**: Estendi il service per inviare email tramite SMTP iCloud

## 📝 Note Tecniche

- Le email vengono salvate in `job_offer_emails`
- Il campo `direction` indica se l'email è `sent` o `received`
- Il campo `message_id` è usato per evitare duplicati
- I destinatari (to, cc, bcc) sono salvati come JSON array
- La preview è limitata ai primi 200 caratteri del corpo email

