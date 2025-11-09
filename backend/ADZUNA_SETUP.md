# 🚀 Job Scraper - Adzuna API

## 📋 Panoramica

Sistema di scraping per offerte di lavoro tramite **Adzuna API**.

### ✅ Cosa è Adzuna?

Adzuna è un aggregatore di offerte di lavoro che **raccoglie** annunci da:
- ✅ **Indeed**
- ✅ **LinkedIn**  
- ✅ **Monster**
- ✅ **InfoJobs**
- ✅ E altri 100+ portali

**API GRATIS**: 10.000 chiamate al mese! 🎉

### 🏗️ Architettura

```
Frontend (Angular)
  ↓
  JobScraperService.scrapeAdzuna()
  ↓
  POST /api/job-scraper/adzuna
  ↓
Backend (Laravel)
  JobScraperController
  ↓
  Adzuna API → Indeed + LinkedIn + Monster
  ↓
  Response con offerte reali
```

---

## 📁 File Struttura

```
backend/
├── app/Http/Controllers/Api/
│   └── JobScraperController.php      # Controller con integrazione Adzuna
├── routes/
│   └── api.php                        # Route: POST /api/job-scraper/adzuna
├── ADZUNA_SETUP.md                    # Questa documentazione
└── .env                               # Configurazione credenziali

frontend/
├── src/app/services/
│   └── job-scraper.service.ts         # Service Angular
└── src/app/pages/job-offers/views/job-offers-add-view/
    ├── job-offers-add-view.ts         # Component
    ├── job-offers-add-view.html       # Template con box Adzuna
    └── job-offers-add-view.css        # Stili
```

---

## 📝 Setup in 5 Minuti

### 1️⃣ Registrazione

Vai su: **https://developer.adzuna.com/signup**

Compila il form:
- Nome
- Email
- Password
- Accetta Terms & Conditions

### 2️⃣ Ottieni le Credenziali

Dopo la registrazione riceverai via email:
- `APP_ID` (es: `12345678`)
- `APP_KEY` (es: `abcdef1234567890abcdef1234567890`)

Oppure le trovi nel dashboard: https://developer.adzuna.com/admin/applications

### 3️⃣ Configura Laravel

Apri il file `.env` e aggiungi:

```env
# Adzuna API Credentials
ADZUNA_APP_ID=your_app_id_here
ADZUNA_APP_KEY=your_app_key_here
```

**Sostituisci** `your_app_id_here` e `your_app_key_here` con le tue credenziali.

### 4️⃣ Testa l'Integrazione

```bash
# Riavvia Laravel
php artisan optimize:clear
php artisan serve
```

Poi dal frontend clicca su "Cerca Offerte Online" e guarda la console:

```
✅ Adzuna scraping completato: {...}
📊 Trovate 20 offerte da Indeed, LinkedIn, Monster: [...]
```

---

## 🔍 Come Funziona

### Senza Credenziali (Mock Data)
```
User clicca → Frontend → Backend → Mock data → 20 offerte fake
```

### Con Credenziali Adzuna (Dati Reali)
```
User clicca → Frontend → Backend → Adzuna API → Indeed/LinkedIn/Monster → 20 offerte REALI ✨
```

---

## 📊 Esempio Risposta Adzuna

```json
{
  "success": true,
  "source": "adzuna",
  "count": 20,
  "jobs": [
    {
      "id": "adzuna_123456",
      "title": "Senior PHP Developer",
      "company": "TechCorp S.r.l.",
      "location": "Milano, Lombardia",
      "description": "Cerchiamo sviluppatore PHP senior...",
      "posted_date": "2025-11-05",
      "url": "https://www.adzuna.it/details/123456",
      "salary": "35.000 - 55.000 EUR",
      "employment_type": "Full-time",
      "remote": "Hybrid"
    }
  ]
}
```

---

## ⚙️ Parametri Ricerca

Nel component (`job-offers-add-view.ts`), puoi modificare:

```typescript
const params = {
  keyword: 'Developer',  // ← Cambia la parola chiave
  location: 'Milano',    // ← Cambia la città
  limit: 20              // ← Numero risultati (max 50)
};
```

---

## 🐛 Troubleshooting

### Problema: "Adzuna credentials not configured, using mock data"

**Causa**: Le variabili `ADZUNA_APP_ID` o `ADZUNA_APP_KEY` non sono configurate in `.env`

**Soluzione**:
1. Verifica che `.env` contenga le chiavi
2. Riavvia Laravel: `php artisan serve`
3. Controlla log: `tail -f storage/logs/laravel.log`

### Problema: "Adzuna API error: 401 Unauthorized"

**Causa**: Credenziali errate

**Soluzione**:
- Verifica `APP_ID` e `APP_KEY` nel dashboard Adzuna
- Controlla di aver copiato tutto il valore (senza spazi)

### Problema: "No results found"

**Causa**: Parametri di ricerca troppo specifici

**Soluzione**:
- Usa keyword più generiche (es: "Developer" invece di "Senior PHP Symfony Developer")
- Prova con location diverse o vuote

---

## 📚 Documentazione Adzuna

- **Developer Portal**: https://developer.adzuna.com/
- **API Docs**: https://developer.adzuna.com/docs
- **Dashboard**: https://developer.adzuna.com/admin/applications

---

## 🎯 Limiti API

| Piano | Chiamate/Mese | Costo |
|-------|---------------|-------|
| **Free** | 10.000 | GRATIS 🎉 |
| Premium | 100.000+ | A pagamento |

**10.000 chiamate/mese** = ~330 ricerche al giorno = Più che sufficiente! ✅

---

## ✅ Checklist

- [ ] Registrato su https://developer.adzuna.com/signup
- [ ] Ottenuto APP_ID e APP_KEY
- [ ] Aggiunto credenziali in `.env`
- [ ] Riavviato Laravel (`php artisan serve`)
- [ ] Testato dal frontend (click su "Cerca Offerte Online")
- [ ] Visto offerte REALI in console! 🎉

---

**Pronto?** Clicca su "Cerca Offerte Online" e goditi le offerte REALI! 🚀

**Ancora mock data?** Ricordati di configurare `.env` e riavviare Laravel! 🔄

