# Supabase Edge Function: Resize Avatar 70x70

Obiettivo: in produzione gli avatar caricati vengono salvati come originali su Supabase (percorso avatars/original/<uuid>.<ext>). Una Edge Function ridimensiona in asincrono a 70x70 e salva in avatars/70x70/<uuid>.webp, aggiornando icons.img alla nuova URL.

## Panoramica
- Bucket Storage: src (pubblico)
- Originali: avatars/original/
- Varianti: avatars/70x70/
- Tabella da aggiornare: icons (campo img)
- Funzione: supabase/edge-functions/resize-avatar/index.ts

## Prerequisiti
- Supabase progetto attivo (Free ok)
- Bucket src pubblico
- Service Role Key disponibile (Settings -> API)

## Variabili ambiente (Functions)
Imposta nelle Function Settings:
- SUPABASE_URL = URL del progetto (es. https://xxxxx.supabase.co)
- SUPABASE_SERVICE_ROLE_KEY = chiave service_role (attenzione: privilegi elevati)
- BUCKET = src

## Deploy funzione
Usando Supabase CLI (opzionale):
```
cd supabase/edge-functions/resize-avatar
supabase functions deploy resize-avatar --project-ref <PROJECT_REF>
```
Oppure crea una nuova Edge Function da dashboard e incolla il contenuto di index.ts.

## Trigger Storage (Webhook)
Configura un webhook su Storage:
- Bucket: src
- Evento: object created
- Prefix: avatars/original/
- Target: funzione resize-avatar

## Comportamento
1) All'upload in produzione i controller salvano l'originale sotto avatars/original/ e scrivono in icons.img l'URL pubblico dell'originale.
2) La funzione scarica l'originale, genera una versione 70x70 WEBP in avatars/70x70/.
3) Aggiorna icons.img sostituendo l'URL dell'originale con quello della variante.

## Sicurezza
- Service Role Key e' necessaria per aggiornare la tabella icons. Conservala solo nelle Functions env, non nel client.
- In alternativa, puoi esporre una RPC con policy RLS e usare una key con privilegi ridotti.

## Note
- Se il bucket non e' pubblico, modifica la funzione per usare URL firmate (createSignedUrl) o storage.from(...).download().
- Il formato di output e' WEBP qualita' 80. Adatta se preferisci PNG/JPEG.
