# 🚀 Portfolio Marzio Farina

Un portfolio professionale moderno e performante costruito con **Laravel 12** e **Angular 20**.

[![Laravel](https://img.shields.io/badge/Laravel-12.x-red.svg)](https://laravel.com)
[![Angular](https://img.shields.io/badge/Angular-20.x-red.svg)](https://angular.io)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-blue.svg)](https://tailwindcss.com)
[![DaisyUI](https://img.shields.io/badge/DaisyUI-5.x-purple.svg)](https://daisyui.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://vercel.com)

## ✨ Caratteristiche

- 🎨 **Design Moderno** - Interfaccia pulita e responsive con TailwindCSS e DaisyUI
- ⚡ **Performance Ottimizzate** - Cache intelligente e lazy loading
- 🔐 **Autenticazione Sicura** - Laravel Sanctum per API token-based
- 📱 **Mobile First** - Completamente responsive su tutti i dispositivi
- 🌐 **PWA Ready** - Service Worker e cache offline
- 🚀 **Deploy Automatico** - CI/CD con Vercel
- 📊 **SEO Ottimizzato** - Meta tags e structured data

## 🏗️ Architettura

```
Frontend (Angular 20)     Backend (Laravel 12)      Database
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Components    │◄────►│   API Routes    │◄────►│   PostgreSQL    │
│   Services      │      │   Controllers   │      │   Supabase      │
│   Interceptors  │      │   Resources     │      │                 │
│   Guards        │      │   Middleware    │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## 🚀 Quick Start

### Prerequisiti

- **PHP 8.2+** con estensioni: BCMath, Ctype, cURL, DOM, Fileinfo, JSON, Mbstring, OpenSSL, PCRE, PDO, Tokenizer, XML
- **Composer** 2.0+
- **Node.js** 18+ e **npm** 9+
- **Git**

### Installazione

1. **Clona il repository**
```bash
git clone https://github.com/marziofarina/portfolio.git
cd portfolio
```

2. **Backend Setup**
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm start
```

4. **Apri il browser**
```
Frontend: http://localhost:4200
Backend:  http://localhost:8000
```

## 📁 Struttura Progetto

```
portfolio/
├── 📁 backend/                 # Laravel 12 API
│   ├── 📁 app/
│   │   ├── 📁 Http/
│   │   │   ├── 📁 Controllers/    # API Controllers
│   │   │   ├── 📁 Middleware/     # Custom Middleware
│   │   │   ├── 📁 Requests/       # Form Validation
│   │   │   └── 📁 Resources/      # API Resources
│   │   ├── 📁 Models/             # Eloquent Models
│   │   └── 📁 Mail/               # Email Templates
│   ├── 📁 database/
│   │   ├── 📁 migrations/         # Database Schema
│   │   └── 📁 seeders/            # Sample Data
│   └── 📁 routes/
│       └── 📄 api.php             # API Routes
├── 📁 frontend/               # Angular 20 SPA
│   ├── 📁 src/app/
│   │   ├── 📁 components/         # Reusable Components
│   │   ├── 📁 pages/              # Page Components
│   │   ├── 📁 services/           # Angular Services
│   │   └── 📁 core/               # Core Modules
│   └── 📄 angular.json            # Angular Config
├── 📄 DOCUMENTATION.md            # Documentazione Completa
├── 📄 TECHNICAL_DOCS.md           # Documentazione Tecnica
└── 📄 README.md                   # Questo file
```

## 🛠️ Tecnologie Utilizzate

### Backend
- **Laravel 12** - Framework PHP moderno
- **Laravel Sanctum** - Autenticazione API
- **Intervention Image** - Elaborazione immagini
- **AWS SDK** - Servizi cloud
- **PostgreSQL** - Database principale

### Frontend
- **Angular 20** - Framework TypeScript
- **TailwindCSS 4** - Utility-first CSS
- **DaisyUI 5** - Componenti UI
- **RxJS** - Programmazione reattiva
- **TypeScript** - Superset JavaScript

### DevOps
- **Vercel** - Hosting e deployment
- **GitHub** - Version control
- **Supabase** - Database cloud

### Ridimensionamento avatar (Supabase Edge Function)

In produzione gli avatar caricati vengono salvati come originali su Supabase dentro `avatars/original/`. Una Edge Function su Supabase (gratuito) crea in asincrono una variante 70×70 in `avatars/70x70/` e aggiorna il record in `icons.img` alla nuova URL.

Esempio funzione: `supabase/edge-functions/resize-avatar/index.ts` (Deno + ImageScript).

Setup (riassunto):
- Imposta variabili su Supabase Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BUCKET=src`.
- Crea un webhook Storage sul bucket `src` con prefix `avatars/original/` → funzione `resize-avatar`.
- Bucket pubblico (oppure usa URL firmate e adatta la funzione).

## 📚 Documentazione

- 📖 **[Documentazione Completa](DOCUMENTATION.md)** - Guida dettagliata per sviluppatori
- 🔧 **[Documentazione Tecnica](TECHNICAL_DOCS.md)** - Configurazioni avanzate e API
- 🐛 **[Bug Fix Summary](BUGFIX_SUMMARY.md)** - Cronologia correzioni

## 🌐 API Endpoints

### Pubblici
```http
GET  /api/testimonials     # Lista testimonianze
GET  /api/projects         # Lista progetti
GET  /api/what-i-do        # Servizi offerti
GET  /api/cv               # Curriculum
GET  /api/ping             # Health check
```

### Autenticati
```http
POST /api/auth/login       # Login utente
POST /api/auth/register    # Registrazione
POST /api/auth/logout      # Logout
GET  /api/auth/me          # Profilo utente
POST /api/contact          # Form contatto
```

## 🚀 Deployment

### Produzione
Il progetto è configurato per il deployment automatico su Vercel:

- **Frontend**: `https://marziofarina.it`
- **Backend**: `https://api.marziofarina.it`

### Variabili d'Ambiente

#### Backend (.env)
```env
APP_ENV=production
DB_CONNECTION=pgsql
DB_HOST=your-supabase-host
MAIL_MAILER=smtp
```

#### Frontend (environment.prod.ts)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.marziofarina.it/api'
};
```

## 🧪 Testing

### Backend
```bash
cd backend
composer test
```

### Frontend
```bash
cd frontend
npm test
```

## 📊 Performance

- ⚡ **Lighthouse Score**: 95+
- 🚀 **First Contentful Paint**: < 1.5s
- 📱 **Mobile Performance**: 90+
- 🔍 **SEO Score**: 100

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch per la feature (`git checkout -b feature/amazing-feature`)
3. Commit delle modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

## 📝 Changelog

### v1.0.0 (2025-10-22)
- ✨ Release iniziale
- 🎨 Design completo con TailwindCSS e DaisyUI
- 🔐 Sistema di autenticazione con Laravel Sanctum
- 📱 Interfaccia completamente responsive
- 🚀 Deploy automatico su Vercel

## 📄 Licenza

Questo progetto è proprietario di **Marzio Farina**. Tutti i diritti riservati.

## 📞 Contatti

- **Email**: marzio@marziofarina.it
- **Website**: https://marziofarina.it
- **LinkedIn**: [Marzio Farina](https://linkedin.com/in/marziofarina)

---

<div align="center">

**Sviluppato con ❤️ da Marzio Farina**

[![Portfolio](https://img.shields.io/badge/Portfolio-marziofarina.it-blue)](https://marziofarina.it)
[![Email](https://img.shields.io/badge/Email-marzio@marziofarina.it-green)](mailto:marzio@marziofarina.it)

</div>
