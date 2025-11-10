# 🔐 Come Attivare OAuth (Google, GitHub, Facebook)

I pulsanti OAuth sono **già implementati** ma **temporaneamente nascosti** nel codice HTML finché non configuri le credenziali.

## ✅ Stato Attuale

- ✅ Backend Laravel configurato con Socialite
- ✅ Database aggiornato con colonne OAuth
- ✅ OAuthController implementato
- ✅ Frontend Angular con OAuthService
- ✅ Pulsanti UI pronti (commentati nell'HTML)
- ❌ **Credenziali OAuth non configurate** (per questo sono nascosti)

---

## 🚀 Quando Vorrai Attivare OAuth

### Step 1: Configura le Credenziali

Segui la guida completa in: `backend/OAUTH_SETUP.md`

**In breve:**
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un progetto OAuth
3. Ottieni Client ID e Client Secret
4. Aggiungi al `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=tuo-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tuo-client-secret
   FRONTEND_URL=http://localhost:4200
   ```

### Step 2: Rimuovi i Commenti HTML

Apri `frontend/src/app/components/auth/auth.html` e:

**Nel form di LOGIN** (circa riga 71-92):
```html
<!-- Rimuovi questa riga: <!-- -->

<div class="oauth-divider">
  <span>O continua con</span>
</div>

<div class="oauth-buttons">
  @for (provider of oauth.providers; track provider.provider) {
    <button ...>
      ...
    </button>
  }
</div>

<!-- Rimuovi questa riga: --> -->
```

**Nel form di REGISTRAZIONE** (circa riga 255-276):
```html
<!-- Rimuovi questa riga: <!-- -->

<div class="oauth-divider">
  <span>O registrati con</span>
</div>

<div class="oauth-buttons">
  @for (provider of oauth.providers; track provider.provider) {
    <button ...>
      ...
    </button>
  }
</div>

<!-- Rimuovi questa riga: --> -->
```

### Step 3: Riavvia i Server

```bash
# Backend
cd backend
php artisan serve

# Frontend (altro terminale)
cd frontend
ng serve
```

### Step 4: Testa!

Vai su `http://localhost:4200`, fai logout, e vedrai i pulsanti OAuth apparire nel form di login! 🎉

---

## 📱 Provider Supportati

Quando attiverai OAuth, gli utenti potranno accedere con:

- 🔵 **Google** - Login con account Google/Gmail
- ⚫ **GitHub** - Login con account GitHub
- 🔵 **Facebook** - Login con account Facebook

Ogni provider richiede la propria configurazione separata (vedi `backend/OAUTH_SETUP.md`).

---

## 🔒 Sicurezza

Il sistema OAuth implementato include:

✅ De-duplicazione automatica account (stessa email = collega OAuth)  
✅ Email pre-verificata per account OAuth  
✅ Avatar automatico dal provider  
✅ Stateless authentication (nessuna sessione richiesta)  
✅ Logging dettagliato per debugging  
✅ Gestione errori robusta  

---

## 📚 Documentazione Completa

- `backend/OAUTH_SETUP.md` - Guida setup dettagliata per ogni provider
- `AUTHENTICATION.md` - Architettura e flussi completi del sistema auth
- Questo file - Guida rapida attivazione

---

💡 **Tip**: Puoi abilitare solo i provider che ti servono! Non devi configurarli tutti e 3 contemporaneamente.

