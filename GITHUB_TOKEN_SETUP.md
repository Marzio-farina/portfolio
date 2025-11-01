# Configurazione GitHub Token (Opzionale)

## Problema Rate Limiting

L'API di GitHub ha dei limiti di rate:
- **Senza autenticazione**: 60 richieste/ora per IP
- **Con autenticazione**: 5,000 richieste/ora

## Soluzione: GitHub Personal Access Token

Per evitare problemi di rate limiting, puoi configurare un token GitHub nel backend.

### 1. Crea un Personal Access Token su GitHub

1. Vai su GitHub: https://github.com/settings/tokens
2. Click su **"Generate new token"** → **"Generate new token (classic)"**
3. Imposta un nome descrittivo (es: "Portfolio API")
4. Seleziona lo scope: **`public_repo`** (read-only per repository pubblici)
5. Clicca **"Generate token"**
6. **Copia il token** (lo vedrai solo una volta!)

### 2. Aggiungi il Token nel file .env del Backend

Apri il file `.env` nella cartella `backend/` e aggiungi:

```env
GITHUB_TOKEN=ghp_tuoTokenQuiCopiato
```

**Esempio:**
```env
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
```

### 3. Riavvia il Backend

Dopo aver aggiunto il token, riavvia il server Laravel:

```bash
cd backend
php artisan config:clear
php artisan cache:clear
```

## Come Funziona

### Senza Token
```
Frontend → Backend → GitHub API (limite: 60 req/ora)
```

### Con Token
```
Frontend → Backend + Token → GitHub API (limite: 5,000 req/ora)
```

## Vantaggi

✅ **5,000 richieste/ora** invece di 60
✅ **Nessun 401 Unauthorized**
✅ **Accesso a repository privati** (se necessario)
✅ **Cache lato server** (1 ora) per ridurre ulteriormente le chiamate

## Sicurezza

- ✅ Il token è memorizzato **solo nel backend** (file `.env`)
- ✅ Il frontend **non vede mai** il token
- ✅ Il token ha **permessi limitati** (solo lettura repository pubblici)
- ❌ **NON committare mai** il file `.env` su Git (già ignorato da `.gitignore`)

## Verifica Configurazione

### Test Endpoint
```bash
# Senza token (può dare 401)
curl http://localhost:8000/api/github/Marzio-farina/portfolio/stats

# Con token configurato (dovrebbe funzionare)
curl http://localhost:8000/api/github/Marzio-farina/portfolio/stats
```

### Risposta Attesa
```json
{
  "name": "portfolio",
  "url": "https://github.com/Marzio-farina/portfolio",
  "commits": 123
}
```

### Se Vedi Errore
```json
{
  "error": "Impossibile recuperare i dati da GitHub"
}
```

**Causa**: Rate limit superato o repository non trovato

**Soluzione**: Configura il token GitHub come descritto sopra

## Cache

Il backend cachea automaticamente le risposte per **1 ora**.

Per invalidare la cache manualmente:
```bash
cd backend
php artisan cache:clear
```

## Domande Frequenti

### Il token è obbligatorio?

No, il backend funziona anche senza token, ma con limiti molto più bassi (60 req/ora).

### Posso usare lo stesso token per più progetti?

Sì, puoi riusare lo stesso token per tutti i tuoi progetti.

### Il token scade?

I token "classic" non scadono mai, a meno che non li revochi manualmente o imposti una data di scadenza.

### Come revoco il token?

Vai su https://github.com/settings/tokens e clicca "Delete" accanto al token.

## Produzione

### Vercel/Netlify

Aggiungi la variabile d'ambiente `GITHUB_TOKEN` nel pannello di configurazione:

**Vercel:**
1. Project Settings → Environment Variables
2. Aggiungi `GITHUB_TOKEN` = `ghp_...`

**Netlify:**
1. Site Settings → Build & Deploy → Environment
2. Aggiungi `GITHUB_TOKEN` = `ghp_...`

### Docker

Aggiungi nel `docker-compose.yml`:

```yaml
environment:
  - GITHUB_TOKEN=ghp_...
```

O passa come argomento:

```bash
docker run -e GITHUB_TOKEN=ghp_... ...
```

