# Debug GitHub Integration

## Dove vengono salvati i dati?

I dati vengono salvati nella tabella `social_accounts` del database PostgreSQL/MySQL:

```sql
-- Struttura tabella
social_accounts:
  - id (primary key)
  - user_id (foreign key -> users.id)
  - provider (string) - es: 'github'
  - handle (string, nullable) - es: 'Marzio-farina/portfolio'
  - url (string, nullable) - es: 'https://github.com/Marzio-farina/portfolio'
  - created_at
  - updated_at
```

## Come verificare se i dati sono stati salvati?

### 1. Console del Browser
Apri la console del browser (F12) e guarda i log che iniziano con `[AsideSecondary]`:

```
[AsideSecondary] Tentativo di salvataggio URL: https://github.com/...
[AsideSecondary] Handle estratto: Marzio-farina/portfolio
[AsideSecondary] Invio richiesta al backend...
[AsideSecondary] Payload: {...}
[AsideSecondary] ✅ Risposta backend: {...}
[AsideSecondary] Invalidazione cache...
[AsideSecondary] Ricaricamento profilo...
[AsideSecondary] ✅ Profilo ricaricato: {...}
```

### 2. Query Database
Controlla direttamente nel database:

```sql
-- Verifica tutti i social accounts
SELECT * FROM social_accounts;

-- Verifica social accounts per un utente specifico
SELECT * FROM social_accounts WHERE user_id = 1;

-- Verifica solo GitHub
SELECT * FROM social_accounts WHERE provider = 'github';
```

### 3. Network Tab
Nella tab Network del browser (F12), cerca la richiesta:
- **URL**: `POST http://localhost:8000/api/social-accounts`
- **Headers**: Deve includere `Authorization: Bearer <token>`
- **Payload**: 
  ```json
  {
    "provider": "github",
    "handle": "username/repository",
    "url": "https://github.com/username/repository"
  }
  ```
- **Risposta attesa (200)**:
  ```json
  {
    "provider": "github",
    "handle": "username/repository",
    "url": "https://github.com/username/repository"
  }
  ```

## Errori comuni

### Errore 401 (Unauthenticated)
**Problema**: Non sei autenticato o il token è scaduto
**Soluzione**: 
1. Verifica di essere loggato
2. Controlla che il token sia presente in `localStorage` (chiave: `auth_token`)
3. Riprova a fare login

### Errore 422 (Validation Error)
**Problema**: Dati non validi
**Verifica**:
- L'URL deve contenere `github.com`
- L'URL deve essere valido (formato URL)
- Il provider deve essere 'github'

### La chiamata API non parte
**Problema**: La richiesta non viene inviata
**Verifica**:
1. Controlla i log nella console
2. Verifica che il componente sia in modalità edit
3. Verifica che `canEdit()` sia `true`

### I dati vengono salvati ma non si vedono
**Problema**: Cache non invalidata
**Soluzione**: Già implementata, ma verifica:
1. Controlla i log: deve apparire "Invalidazione cache..."
2. Controlla i log: deve apparire "Profilo ricaricato:"
3. Verifica nel profilo ricaricato che `socials` contenga l'entry GitHub

## Test Manuale Step-by-Step

1. **Login**
   - Vai al tuo portfolio
   - Fai login con le tue credenziali
   - Verifica che compaia il bottone "Accedi"/"Logout"

2. **Attiva Edit Mode**
   - Vai nell'aside (profilo)
   - Clicca sull'icona matita per attivare la modalità edit
   - Verifica che l'aside mostri i controlli di edit

3. **Vai ad Aside Secondary**
   - Su schermi >= 1250px dovrebbe essere visibile sotto l'aside principale
   - Se non hai repository configurato, dovresti vedere il bottone + tratteggiato

4. **Aggiungi Repository**
   - Clicca sul bottone + "Aggiungi Repository"
   - Inserisci URL: `https://github.com/tuo-username/tuo-repository`
   - Premi Salva (o Enter)
   - Apri la console (F12) e verifica i log

5. **Verifica Risultato**
   - Dopo il salvataggio, il form dovrebbe chiudersi
   - Dovrebbe apparire la statistica del numero totale di commits
   - Verifica nel database che sia stata creata la riga
   - Verifica nella console i log del recupero dati GitHub

## Query SQL Utili

```sql
-- Cancella un social account specifico
DELETE FROM social_accounts WHERE user_id = 1 AND provider = 'github';

-- Aggiorna manualmente
UPDATE social_accounts 
SET url = 'https://github.com/new-url/new-repo', 
    handle = 'new-url/new-repo' 
WHERE user_id = 1 AND provider = 'github';

-- Inserisci manualmente per test
INSERT INTO social_accounts (user_id, provider, handle, url, created_at, updated_at)
VALUES (1, 'github', 'Marzio-farina/portfolio', 'https://github.com/Marzio-farina/portfolio', NOW(), NOW());
```

## Endpoint API

### Salva/Aggiorna Social Account
```
POST /api/social-accounts
Headers: Authorization: Bearer <token>
Body: {
  "provider": "github",
  "handle": "username/repository",
  "url": "https://github.com/username/repository"
}
```

### Elimina Social Account
```
DELETE /api/social-accounts/github
Headers: Authorization: Bearer <token>
```

## Verifica Backend

Puoi testare direttamente con cURL:

```bash
# Salva GitHub account
curl -X POST http://localhost:8000/api/social-accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "github",
    "handle": "Marzio-farina/portfolio",
    "url": "https://github.com/Marzio-farina/portfolio"
  }'

# Verifica profilo pubblico
curl http://localhost:8000/api/public-profile

# Elimina GitHub account
curl -X DELETE http://localhost:8000/api/social-accounts/github \
  -H "Authorization: Bearer YOUR_TOKEN"
```

