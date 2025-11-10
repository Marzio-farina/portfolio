# Configurazione OAuth

Questo documento spiega come configurare l'autenticazione OAuth con Google, GitHub e Facebook.

## Variabili d'ambiente richieste

Aggiungi queste variabili al tuo file `.env`:

```env
# Frontend URL (per redirect OAuth)
FRONTEND_URL=http://localhost:4200

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Facebook OAuth (opzionale)
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

## Setup Google OAuth

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o selezionane uno esistente
3. Abilita "Google+ API"
4. Vai su "Credenziali" → "Crea credenziali" → "ID client OAuth 2.0"
5. Tipo applicazione: **Applicazione web**
6. Origini JavaScript autorizzate:
   - `http://localhost:4200`
   - `http://localhost:8000`
7. URI di reindirizzamento autorizzati:
   - `http://localhost:8000/api/auth/google/callback`
8. Copia **Client ID** e **Client Secret** nel `.env`

## Setup GitHub OAuth

1. Vai su [GitHub Settings → Developer settings](https://github.com/settings/developers)
2. Clicca "New OAuth App"
3. Compila:
   - Application name: `Portfolio App (Dev)`
   - Homepage URL: `http://localhost:4200`
   - Authorization callback URL: `http://localhost:8000/api/auth/github/callback`
4. Copia **Client ID** e genera **Client Secret**
5. Aggiungi al `.env`

## Setup Facebook OAuth (opzionale)

1. Vai su [Facebook Developers](https://developers.facebook.com/)
2. Crea una nuova app → Tipo: "Consumer"
3. Aggiungi prodotto "Facebook Login"
4. Impostazioni → Base:
   - Copia **App ID** → `FACEBOOK_CLIENT_ID`
   - Copia **App Secret** → `FACEBOOK_CLIENT_SECRET`
5. Facebook Login → Impostazioni:
   - URI di reindirizzamento OAuth validi: `http://localhost:8000/api/auth/facebook/callback`

## Produzione

Per produzione, aggiorna gli URL di callback nei vari provider:
- Frontend: `https://tuodominio.com`
- Callback: `https://tuodominio.com/api/auth/{provider}/callback`

E aggiorna il `.env` di produzione con i nuovi valori.

## Test

Dopo aver configurato almeno un provider, riavvia il server Laravel e testa:

```bash
# Backend
php artisan serve

# Frontend
ng serve
```

Vai su `http://localhost:4200` e clicca su uno dei pulsanti OAuth nel form di login/registrazione.

