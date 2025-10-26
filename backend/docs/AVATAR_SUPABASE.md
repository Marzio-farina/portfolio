# Configurazione Avatar con Supabase S3

## Setup

### 1. Variabili Environment

Aggiungi le seguenti variabili in `.env` (produzione) e `.env.local` (localhost):

```env
# Supabase S3 Configuration
SUPABASE_S3_KEY=your_s3_access_key
SUPABASE_S3_SECRET=your_s3_secret_key
SUPABASE_S3_REGION=us-east-1
SUPABASE_S3_BUCKET=src
SUPABASE_S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
SUPABASE_S3_URL=https://your-project.supabase.co/storage/v1/object/public/src
# Oppure usa SUPABASE_PUBLIC_URL se già esistente
# SUPABASE_PUBLIC_URL=https://your-project.supabase.co/storage/v1/object/public/src
```

### 2. Carica gli avatar esistenti su Supabase

Esegui il comando Artisan:

```bash
php artisan avatars:upload-to-supabase
```

Questo comando:
- Carica gli avatar esistenti da `storage/app/public/avatars/` su Supabase S3
- Aggiorna i record nel database con gli URL Supabase
- Gestisce automaticamente gli errori

### 3. Nuovi Avatar

I nuovi avatar caricati tramite l'API vengono automaticamente salvati su:
- **Supabase S3** (produzione): se `SUPABASE_S3_KEY` e `SUPABASE_S3_URL` sono configurati
- **Storage locale** (development): se Supabase non è configurato

## Funzionamento

### AvatarController

Il controller gestisce automaticamente:
- Caricamento su Supabase in produzione
- Fallback a storage locale per development
- Ottimizzazione immagini (200x200px, qualità 85%)
- Gestione errori

### getAbsoluteUrl()

Il metodo `getAbsoluteUrl()` in `TestimonialResource` e `TestimonialController`:
- Restituisce URL Supabase se già assoluto (https://)
- Costruisce URL dinamicamente per storage locale
- Ha fallback a `APP_URL` se la richiesta non è disponibile

## Testing

### Localhost (senza Supabase)
Gli avatar vengono salvati in `storage/app/public/avatars/` e serviti da `/storage/avatars/`

### Produzione (con Supabase)
Gli avatar vengono salvati su Supabase S3 e serviti tramite URL pubblico

## Troubleshooting

### Gli avatar non si vedono in produzione
1. Verifica che le variabili Supabase siano configurate correttamente
2. Esegui `php artisan avatars:upload-to-supabase` per migrare gli avatar
3. Controlla i logs: `tail -f storage/logs/laravel.log`

### Errore "Unable to connect to Supabase"
- Verifica le credenziali S3 in `.env`
- Controlla che il bucket esista e sia pubblico
- Verifica le CORS policy su Supabase

