# Politica definitiva di storage avatar

Stato: APPROVATA • Ottobre 2025

Questa policy stabilisce in modo definitivo come vengono gestite e servite le immagini avatar caricate dagli utenti e gli avatar di default, in locale e in produzione. Le regole qui descritte sostituiscono e vincolano qualsiasi approccio alternativo.

## Obiettivo e scope
- Laravel gestisce end‑to‑end: ricezione upload, validazione, ottimizzazione, naming, path, salvataggio metadati nel DB, generazione URL.
- Lo storage fisico dei file in produzione è ESTERNO (S3‑compatibile). In locale si usa il disco pubblico.

## Decisione architetturale (definitiva)
- Locale (sviluppo):
  - Scrittura su `storage/app/public/avatars` (disk `public`).
  - Nel DB si salva il path relativo con prefisso `storage/`, es. `storage/avatars/avatar_<uuid>.png`.
  - Gli asset sono serviti via `/storage/avatars/...` (symlink `public/storage`).
- Produzione (Vercel):
  - File scritti su storage esterno S3‑compatibile (Supabase) usando il disk `src` definito in `config/filesystems.php`.
  - L’immagine è ottimizzata in memoria e poi inviata al bucket; nel DB si salva l’URL pubblico ASSOLUTO, es. `https://<public-url>/avatars/avatar_<uuid>.png`.
  - Il filesystem di Vercel è read‑only a runtime: non si scrive su `public/` o `storage/` durante le richieste.

## Flusso di upload
1) Validazione (server): `image` + `mimes:jpeg,png,jpg,gif,webp` + `max:2048`.
2) Naming: `avatar_<uuid>.<ext>` per upload diretto; `testimonial_avatar_<uuid>.<ext>` per upload da form testimonial.
3) Ottimizzazione:
   - Avatar standalone: max 200×200, qualità 85.
   - Avatar testimonial: max 150×150, qualità 85.
4) Scrittura:
   - Prod: `Storage::disk('src')->put('avatars/<file>', <binary>)` e salvataggio URL assoluto nel DB.
   - Dev: `Storage::disk('public')->storeAs('avatars', <file>)` e salvataggio `storage/avatars/<file>` nel DB.

## Endpoint coinvolti (immutabili)
- `POST /api/avatars/upload` → crea record in `icons` con `{ id, img, alt, type='user_uploaded' }`.
- `POST /api/testimonials` → se presente `avatar_file`, crea una `icon` come sopra e collega `icon_id` al testimonial.
- `GET /api/testimonials`, `GET /api/testimonials/default-avatars`, `GET /api/testimonials/icons` → restituiscono URL utilizzabili direttamente dal frontend.

## Regole su path e URL
- Il campo `icons.img` può contenere:
  - In produzione: URL assoluto pubblico (es. Supabase) → va mostrato “as is”.
  - In locale: path relativo con prefisso `storage/` → il client o le API lo risolvono in `http://localhost:8000/storage/...`.
- Compatibilità: se nei dati legacy appare `avatars/...`, le API normalizzano a `storage/avatars/...` quando costruiscono l’URL.

## Frontend: consumo degli avatar
- Usare SEMPRE l’URL restituito dalle API.
- Se l’URL è assoluto (`http`/`https`), usarlo direttamente.
- Se l’URL è relativo `storage/...`, prefissare l’API base (`http://localhost:8000` o `https://api.marziofarina.it`).
- Ignorare URL monchi (es. `storage/`) e mostrare avatar di default.

## Configurazione ambienti
Variabili richieste in produzione (disk `src`):
- `SUPABASE_S3_KEY`
- `SUPABASE_S3_SECRET`
- `SUPABASE_S3_REGION` (es. `us-east-1`)
- `SUPABASE_S3_BUCKET` (es. `src`)
- `SUPABASE_S3_ENDPOINT`
- `SUPABASE_S3_URL` oppure `SUPABASE_PUBLIC_URL` (URL pubblico da usare negli `img`)

Database (produzione): configurare `DB_CONNECTION` e variabili `DB_*` valide. In locale è consentito `sqlite` (file incluso nel repo).

## Routing e statici
- `vercel.json` mappa `/storage/avatars/*` → `/public/storage/avatars/*` per gli avatar di default e altri asset bundlati.
- Route fallback Laravel `/avatars/{filename}` è disponibile e consente `@` nel nome, ma non viene usata per i file utente in produzione (che hanno URL assoluto su CDN/S3).

## Migrazioni e compatibilità
- Migration presente per aggiungere il prefisso `storage/` ai record legacy che avevano `avatars/...`.
- Query di pulizia suggerite (da eseguire consapevolmente):
  - `UPDATE icons SET img = 'storage/' || img WHERE img LIKE 'avatars/%';`
  - `UPDATE icons SET img = NULL WHERE img IN ('storage', 'storage/');`

## Troubleshooting
- 404 su `/avatars/<file>` in produzione → i file utente sono su CDN: usare l’URL assoluto da `icons.img`.
- 500 su API → verificare connessione DB in produzione (variabili `DB_*`).
- Immagine non visibile → verificare che `icons.img` non sia `storage/` o vuoto; in prod controllare che l’oggetto esista nel bucket `avatars/`.

## Cose da NON fare
- Non scrivere file su `public/` o `storage/` in produzione durante le richieste.
- Non salvare nel DB path senza estensione o senza nome file (es. `storage/`).
- Non trasformare URL assoluti in path relativi lato backend o frontend.

## Checklist deploy
- [ ] Variabili `SUPABASE_*` configurate su Vercel.
- [ ] Variabili DB configurate e raggiungibili.
- [ ] `php artisan migrate` eseguito (in ambienti dove applicabile).
- [ ] Test manuale: upload avatar → record in `icons` con URL valido → immagine visibile.


