# Analisi: GET /me vs GET /public-profile

## 📊 Confronto degli Endpoint

### **GET /api/me** (AuthController)
**Percorso:** `backend/app/Http/Controllers/AuthController.php:202`

#### Caratteristiche:
- ✅ **Richiede autenticazione** (token Sanctum)
- ✅ **Ritorna modello User completo** (tutti i campi, inclusi dati sensibili)
- ✅ **Usato per verifica identità** utente autenticato
- ✅ **Accessibile solo se loggato**

#### Dati ritornati:
```php
return response()->json($user); // Tutto il modello User
```
Include: `id`, `email`, `name`, `slug`, `password`, `created_at`, `updated_at`, `icon_id`, ecc.

#### Utilizzo nel frontend:
**File:** `frontend/src/app/services/auth.service.ts:179`
```typescript
private loadAuthenticatedUserId(): void {
  const url = apiUrl('/me');
  this.http.get<{ id: number; email: string; name: string; slug?: string }>(url).subscribe({
    next: (user) => {
      this.authenticatedUserId.set(user.id);
      this.authenticatedUserSlug.set(user.slug || null);
      this.editMode.setAuthenticatedUserId(user.id);
    }
  });
}
```

**Scopo:** 
- Verifica che il token sia valido
- Ottiene l'ID dell'utente autenticato
- Imposta `authenticatedUserId` e `authenticatedUserSlug`
- Notifica EditModeService dell'ID utente

**Quando viene chiamato:**
- Dopo il login
- Quando si verifica l'autenticazione
- Quando il token viene aggiornato

---

### **GET /api/public-profile** (UserPublicController)
**Percorso:** `backend/app/Http/Controllers/Api/UserPublicController.php:24`

#### Caratteristiche:
- ❌ **NON richiede autenticazione** (pubblico)
- ✅ **Ritorna solo dati pubblici** filtrati tramite `UserPublicResource`
- ✅ **Ha cache di 60 secondi**
- ✅ **Accessibile senza login**

#### Dati ritornati:
```php
return (new UserPublicResource($user))->toArray($request);
```

Include SOLO dati pubblici:
- `id`, `name`, `surname`, `email`, `slug`
- `title`, `headline`, `bio`, `phone`, `location`, `location_url`
- `avatar_url` (URL assoluto)
- `date_of_birth`, `date_of_birth_it`, `age`
- `socials` (array di social links)

**NON include:** `password`, `created_at`, `updated_at`, token, ecc.

#### Utilizzo nel frontend:
**File:** `frontend/src/app/services/about-profile.service.ts:53`
```typescript
get$(userId?: number): Observable<PublicProfileDto> {
  // Caso 1: richiesta esplicita per userId
  if (userId !== undefined) {
    return this.getProfileByUserId(userId);
  }
  
  // Caso 2: route con slug (tenant multi-utente)
  const tenantSlug = this.tenant.userSlug();
  if (tenantSlug) {
    return this.getProfileBySlug(tenantSlug);
  }
  
  // Caso 3: profilo di default
  return this.getDefaultProfile();
}
```

**Scopo:**
- Mostrare il profilo pubblico nell'Aside
- Caricare dati pubblici per visualizzazione
- Supportare multi-tenant (slug diversi per utenti diversi)

**Quando viene chiamato:**
- Al caricamento iniziale della pagina
- Quando si naviga tra sezioni
- Per mostrare i dati pubblici del profilo (nome, bio, avatar, social, ecc.)

---

## 🔍 Conclusioni

### **GET /me NON è superfluo** ✅

#### Perché servono entrambi:

1. **Scopi diversi:**
   - `/me` → **Autenticazione** (chi sono io? sono loggato?)
   - `/public-profile` → **Visualizzazione** (mostra profilo pubblico)

2. **Sicurezza:**
   - `/me` ritorna **tutti i dati** dell'utente (anche sensibili come password hash)
   - `/public-profile` ritorna **solo dati pubblici** filtrati
   - **NON puoi sostituire /me con /public-profile** perché esporresti dati sensibili

3. **Autenticazione vs Pubblico:**
   - `/me` richiede autenticazione (token)
   - `/public-profile` è pubblico (accessibile senza login)
   - **NON puoi usare /me al posto di /public-profile** perché fallirebbe quando non sei loggato

4. **Uso nel frontend:**
   - `/me` → Verifica identità, ottiene ID utente autenticato
   - `/public-profile` → Mostra profilo pubblico nell'Aside, supporta multi-tenant

---

## 📝 Raccomandazioni

### ✅ **Mantieni entrambi gli endpoint**

1. **GET /me** è necessario per:
   - Verificare autenticazione
   - Ottenere ID utente autenticato
   - Gestire stato di login

2. **GET /public-profile** è necessario per:
   - Mostrare profilo pubblico (anche senza login)
   - Supportare multi-tenant (slug diversi)
   - Evitare esposizione di dati sensibili

### 🔒 **Ottimizzazioni possibili:**

1. **GET /me** potrebbe ritornare meno dati:
   ```php
   // Invece di ritornare tutto il modello User
   return response()->json([
     'id' => $user->id,
     'email' => $user->email,
     'name' => $user->name,
     'slug' => $user->slug
   ]);
   ```
   Questo ridurrebbe l'esposizione di dati sensibili.

2. **GET /public-profile** è già ottimizzato:
   - Cache di 60 secondi ✅
   - Solo dati pubblici ✅
   - Eager loading mirato ✅

---

## 🎯 Risposta finale

**NO, GET /me NON è superfluo** perché:
- Serve per autenticazione e verifica identità
- Ritorna dati diversi da /public-profile (inclusi dati sensibili)
- Viene usato per scopi diversi (auth vs visualizzazione)

**I due endpoint sono complementari e entrambi necessari.**

