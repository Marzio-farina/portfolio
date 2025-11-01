# GitHub Repository Integration

## Panoramica

Il componente `aside-secondary` mostra le statistiche della repository GitHub del portfolio.
I dati vengono salvati in una **tabella dedicata** `github_repositories`, completamente separata da `social_accounts`.

## Struttura Database

### Tabella: `github_repositories`

```sql
CREATE TABLE github_repositories (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  owner VARCHAR(100) NOT NULL,      -- es: "Marzio-farina"
  repo VARCHAR(100) NOT NULL,       -- es: "portfolio"
  url VARCHAR(255) NOT NULL,        -- es: "https://github.com/Marzio-farina/portfolio"
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(user_id, owner, repo),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Relazioni

- **User → GitHubRepository**: `hasOne` (un utente può avere una sola repository configurata)
- **GitHubRepository → User**: `belongsTo`

## Separazione Social Accounts

### `social_accounts` (per profili social)
```
user_id | provider  | handle        | url
--------|-----------|---------------|----------------------------------
1       | github    | Marzio-farina | https://github.com/Marzio-farina
1       | linkedin  | marzio-farina | https://linkedin.com/in/...
```
Usato per: Link al **profilo** GitHub/LinkedIn/Instagram/Facebook

### `github_repositories` (per repository specifiche)
```
user_id | owner         | repo      | url
--------|---------------|-----------|----------------------------------
1       | Marzio-farina | portfolio | https://github.com/Marzio-farina/portfolio
```
Usato per: Statistiche della **repository** del portfolio

## API Endpoints

### Autenticati (richiedono Bearer token)

#### Ottieni repository
```http
GET /api/github-repository
Authorization: Bearer {token}

Response 200:
{
  "id": 1,
  "owner": "Marzio-farina",
  "repo": "portfolio",
  "url": "https://github.com/Marzio-farina/portfolio"
}

Response 200 (nessuna repository):
null
```

#### Crea/Aggiorna repository
```http
POST /api/github-repository
Authorization: Bearer {token}
Content-Type: application/json

{
  "owner": "Marzio-farina",
  "repo": "portfolio",
  "url": "https://github.com/Marzio-farina/portfolio"
}

Response 200:
{
  "id": 1,
  "owner": "Marzio-farina",
  "repo": "portfolio",
  "url": "https://github.com/Marzio-farina/portfolio"
}
```

#### Elimina repository
```http
DELETE /api/github-repository
Authorization: Bearer {token}

Response 200:
{
  "message": "GitHub repository deleted"
}
```

### Pubblici (nessuna autenticazione)

#### Ottieni statistiche repository
```http
GET /api/github/{owner}/{repo}/stats

Response 200:
{
  "name": "portfolio",
  "url": "https://github.com/Marzio-farina/portfolio",
  "commits": 123
}
```

## Servizi Frontend

### GitHubRepositoryService
```typescript
// Ottiene la repository dell'utente
get$(): Observable<GitHubRepositoryResponse | null>

// Salva/aggiorna repository
upsert$(data: GitHubRepositoryDto): Observable<GitHubRepositoryResponse>

// Elimina repository
delete$(): Observable<{ message: string }>
```

### GitHubService
```typescript
// Ottiene statistiche via proxy backend
getFullRepoStats$(githubUrl: string): Observable<RepoStats | null>
```

## Flusso Completo

### 1. Caricamento Iniziale
```
AsideSecondary → GitHubRepositoryService.get$()
                ↓
             Backend /api/github-repository
                ↓
             Table: github_repositories
                ↓
             Ritorna: { owner, repo, url }
                ↓
          GitHubService.getFullRepoStats$(url)
                ↓
             Backend /api/github/{owner}/{repo}/stats
                ↓
             GitHub API (con cache 1h)
                ↓
             Mostra: commits count
```

### 2. Salvataggio Repository (Edit Mode)
```
User inserisce URL → AsideSecondary.onSave()
                    ↓
              Parsing URL → { owner, repo }
                    ↓
    GitHubRepositoryService.upsert$({ owner, repo, url })
                    ↓
              Backend salva in github_repositories
                    ↓
              Ricarica repository → Mostra statistiche
```

## Seeding

### Seeder: GitHubRepositorySeeder
Popola la repository iniziale per l'utente principale:

```php
GitHubRepository::updateOrCreate(
    ['user_id' => $user->id],
    [
        'owner' => 'Marzio-farina',
        'repo' => 'portfolio',
        'url' => 'https://github.com/Marzio-farina/portfolio',
    ]
);
```

### Eseguire i Seeder
```bash
# Tutti i seeder
php artisan db:seed

# Solo GitHub repository
php artisan db:seed --class=GitHubRepositorySeeder

# Reset completo e seeding
php artisan migrate:fresh --seed
```

## Query SQL Utili

```sql
-- Visualizza repository configurate
SELECT * FROM github_repositories;

-- Visualizza repository per utente specifico
SELECT * FROM github_repositories WHERE user_id = 1;

-- Aggiorna repository manualmente
UPDATE github_repositories 
SET owner = 'Marzio-farina', 
    repo = 'portfolio',
    url = 'https://github.com/Marzio-farina/portfolio'
WHERE user_id = 1;

-- Elimina repository
DELETE FROM github_repositories WHERE user_id = 1;

-- Visualizza social accounts (separati!)
SELECT * FROM social_accounts WHERE user_id = 1;
```

## Test con cURL

```bash
# Ottieni repository (richiede autenticazione)
curl http://localhost:8000/api/github-repository \
  -H "Authorization: Bearer YOUR_TOKEN"

# Salva repository
curl -X POST http://localhost:8000/api/github-repository \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "Marzio-farina",
    "repo": "portfolio",
    "url": "https://github.com/Marzio-farina/portfolio"
  }'

# Ottieni statistiche (pubblico, no auth)
curl http://localhost:8000/api/github/Marzio-farina/portfolio/stats
```

## Differenze Chiave

| Caratteristica | social_accounts | github_repositories |
|---------------|-----------------|---------------------|
| Scopo | Link ai profili social | Repository specifica |
| Esempio URL | https://github.com/Marzio-farina | https://github.com/Marzio-farina/portfolio |
| Campi | provider, handle, url | owner, repo, url |
| Relazione | hasMany (multi social) | hasOne (una sola repo) |
| Usato in | Aside (contatti social) | AsideSecondary (stats GitHub) |

## Vantaggi Separazione

✅ **Dati isolati**: I social links non vengono sovrascritti
✅ **Struttura chiara**: Owner e Repo come campi separati
✅ **Scalabilità**: In futuro potrai avere più repository (cambiando hasOne → hasMany)
✅ **Semantica corretta**: Social = profilo, Repository = progetto specifico

