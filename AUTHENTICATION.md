# Sistema di Autenticazione

## Overview

Il portfolio utilizza un sistema di autenticazione multi-metodo che supporta:

### ✅ Metodi di Autenticazione Supportati

1. **Email/Password** (tradizionale)
   - Registrazione con validazione email
   - Login con credenziali
   - Reset password via email

2. **OAuth Providers** (Social Login)
   - 🔵 **Google** - Login con account Google
   - ⚫ **GitHub** - Login con account GitHub  
   - 🔵 **Facebook** - Login con account Facebook

## Architettura

### Backend (Laravel 12)

- **Framework**: Laravel Sanctum per token-based authentication
- **OAuth**: Laravel Socialite per integrazione provider
- **Database**: Colonne OAuth aggiunte alla tabella `users`

**File principali:**
- `app/Http/Controllers/AuthController.php` - Autenticazione tradizionale
- `app/Http/Controllers/OAuthController.php` - Autenticazione OAuth
- `database/migrations/*_add_oauth_columns_to_users_table.php` - Schema OAuth
- `config/services.php` - Configurazione provider OAuth
- `routes/api.php` - Route autenticazione

**Colonne database OAuth:**
```php
oauth_provider       // 'google', 'github', 'facebook'
oauth_provider_id    // ID univoco dal provider
oauth_token         // Token OAuth (per refresh)
oauth_avatar_url    // Avatar URL dal provider
```

### Frontend (Angular 20)

- **Framework**: Angular Signals per state management
- **Storage**: Token in localStorage
- **Guards**: AuthGuard per protezione route

**File principali:**
- `src/app/services/auth.service.ts` - Servizio autenticazione principale
- `src/app/services/oauth.service.ts` - Servizio OAuth
- `src/app/components/auth/` - Componente UI login/registrazione
- `src/app/components/oauth-callback/` - Gestione callback OAuth
- `src/app/guards/auth.guard.ts` - Protezione route
- `src/app/core/auth.interceptor.ts` - Intercettore HTTP per token

## Flusso OAuth

### 1. Utente clicca su "Accedi con Google" (esempio)

```
Frontend → Backend
GET http://localhost:8000/api/auth/google
```

### 2. Backend reindirizza a Google

```
Backend → Google OAuth
Redirect a https://accounts.google.com/o/oauth2/auth?...
```

### 3. Utente autorizza l'app su Google

```
Google → Backend
GET http://localhost:8000/api/auth/google/callback?code=...
```

### 4. Backend crea/trova utente e genera token

```php
// Cerca utente esistente per OAuth provider+ID
$user = User::where('oauth_provider', 'google')
    ->where('oauth_provider_id', $googleId)
    ->first();

// O cerca per email se non trovato
if (!$user && $email) {
    $user = User::where('email', $email)->first();
    // Collega account OAuth a utente esistente
}

// Crea nuovo utente se necessario
if (!$user) {
    $user = User::create([...]);
}

// Genera token Sanctum
$token = $user->createToken('spa')->plainTextToken;
```

### 5. Backend reindirizza al frontend con token

```
Backend → Frontend
http://localhost:4200/auth/callback?token=xxx&provider=google
```

### 6. Frontend salva token e completa login

```typescript
// OAuthCallbackComponent riceve il token
localStorage.setItem('auth_token', token);
authService.token.set(token);
authService.refreshMe();

// Redirect alla dashboard
router.navigate(['/about']);
```

## Configurazione

### Prerequisiti

1. Configura le credenziali OAuth (vedi `backend/OAUTH_SETUP.md`)
2. Aggiungi le variabili al file `.env`:

```env
FRONTEND_URL=http://localhost:4200

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
```

### URL di Callback Configurati

| Provider | Callback URL |
|----------|-------------|
| Google   | `http://localhost:8000/api/auth/google/callback` |
| GitHub   | `http://localhost:8000/api/auth/github/callback` |
| Facebook | `http://localhost:8000/api/auth/facebook/callback` |

## Sicurezza

### De-duplicazione Account

Il sistema previene account duplicati:

1. **Stesso provider + ID**: usa account esistente
2. **Stessa email**: collega OAuth a account esistente
3. **Nuovo utente**: crea nuovo account

### Email Verification

Gli account OAuth hanno `email_verified_at` impostato automaticamente, in quanto l'email è già verificata dal provider.

### Password per OAuth

Gli account OAuth ricevono una password casuale hashata (non utilizzabile per login tradizionale).

## Testing

### Test Manuale

1. Avvia backend: `php artisan serve`
2. Avvia frontend: `ng serve`
3. Vai su `http://localhost:4200`
4. Clicca su "Accedi con Google" (o altro provider)
5. Autorizza l'app
6. Verifica redirect e login completato

### Debugging

**Backend logs:**
```bash
php artisan pail
```

**Frontend console:**
- `🔐 Iniziando autenticazione OAuth con {provider}` - Click su bottone
- `✅ OAuth callback ricevuto da {provider}` - Callback completato
- `💾 Salvate N nuove offerte...` - Token salvato

## Struttura Files

```
backend/
├── app/
│   ├── Http/Controllers/
│   │   ├── AuthController.php          # Auth tradizionale
│   │   └── OAuthController.php         # Auth OAuth
│   └── Models/
│       └── User.php                    # User model con OAuth
├── config/
│   └── services.php                    # Config OAuth providers
├── database/migrations/
│   └── *_add_oauth_columns_to_users_table.php
├── routes/
│   └── api.php                         # Route OAuth
└── OAUTH_SETUP.md                      # Guida setup dettagliata

frontend/
├── src/app/
│   ├── services/
│   │   ├── auth.service.ts             # Autenticazione principale
│   │   └── oauth.service.ts            # OAuth service
│   ├── components/
│   │   ├── auth/                       # Login/Register UI
│   │   └── oauth-callback/             # OAuth callback handler
│   ├── guards/
│   │   └── auth.guard.ts               # Protezione route
│   └── core/
│       └── auth.interceptor.ts         # HTTP interceptor
```

## Note Implementative

### Gestione Avatar

Gli utenti OAuth ricevono automaticamente l'avatar dal provider:
- Salvato in `oauth_avatar_url`
- Copiato anche in `profile.avatar_url` alla creazione
- Può essere sovrascritto dall'utente nel profilo

### Collegamento Account Esistenti

Se un utente si registra con email/password e poi accede con Google usando la stessa email:
- L'account esistente viene collegato al provider OAuth
- L'utente può usare entrambi i metodi di login
- I dati esistenti vengono preservati

### Ruoli Utente

Tutti i nuovi utenti (sia tradizionali che OAuth) ricevono automaticamente il ruolo `Guest`.

