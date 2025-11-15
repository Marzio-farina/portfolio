# 🚀 Ottimizzazione Vercel Functions - Guida Completa

## 📊 Situazione Attuale

- **Memoria allocata**: 2.05 GB
- **GB-Hrs utilizzati**: 4.6 GB-Hrs (30 giorni)
- **Invocazioni**: 83
- **Cold Start**: 15.7%
- **Costo stimato**: ~$0.46/mese (con 4.6 GB-Hrs)

## 🎯 Obiettivi di Ottimizzazione

1. **Ridurre memoria da 2.05 GB a 1 GB** → Risparmio 50%
2. **Ridurre cold start dal 15.7%** → Performance migliori
3. **Ottimizzare Laravel per serverless** → Tempi di esecuzione più rapidi
4. **Aggiungere caching** → Meno invocazioni al database

## 🔧 Ottimizzazioni Implementate

### 1. Configurazione Vercel Ottimizzata (`vercel.optimized.json`)

```json
{
  "functions": {
    "api/index.php": {
      "runtime": "vercel-php@0.7.4",
      "memory": 1024,        // Ridotto da 2.05 GB a 1 GB
      "maxDuration": 30,     // Limite 30 secondi
      "regions": ["iad1"]    // Regione fissa per ridurre cold start
    }
  }
}
```

**Risparmio stimato**: ~50% su GB-Hrs (da 4.6 a ~2.3 GB-Hrs)

### 2. Ottimizzazione Laravel per Serverless

#### File: `api/index.php` (modifiche proposte)

```php
<?php

chdir(dirname(__DIR__));

// Disabilita debug in produzione
if (isset($_ENV['APP_DEBUG']) && $_ENV['APP_DEBUG'] === 'false') {
    error_reporting(E_ERROR | E_WARNING | E_PARSE);
    ini_set('display_errors', '0');
}

// Cache statica per configurazioni (solo in produzione)
$cacheFile = __DIR__.'/../bootstrap/cache/config.php';
if (file_exists($cacheFile)) {
    // Usa cache esistente se valida
    $cacheTime = filemtime($cacheFile);
    if (time() - $cacheTime < 3600) { // Cache valida per 1 ora
        // Mantieni cache
    } else {
        // Rimuovi solo cache stale dopo 1 ora
        @unlink($cacheFile);
    }
} else {
    // Rimuovi altre cache solo se config non esiste
    $cacheDir = __DIR__.'/../bootstrap/cache';
    @unlink($cacheDir.'/routes-v7.php');
    @unlink($cacheDir.'/routes.php');
    @unlink($cacheDir.'/events.php');
    @unlink($cacheDir.'/packages.php');
    @unlink($cacheDir.'/services.php');
}

// Avvia Laravel
require __DIR__.'/../public/index.php';
```

**Benefici**:
- Mantiene cache valida per 1 ora (riduce bootstrap time)
- Rimuove cache stale solo quando necessario
- Disabilita debug in produzione

### 3. Ottimizzazioni Laravel (Configurazione)

#### File: `config/app.php`

Assicurati che:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `LOG_LEVEL=error` (solo errori, non tutti i log)

#### File: `bootstrap/app.php`

Aggiungi middleware per ottimizzare:

```php
// In produzione, usa cache delle route
if (app()->environment('production')) {
    Route::middleware('cache.headers:public;max_age=300')->group(function () {
        // Route pubbliche con cache
    });
}
```

### 4. Query Database Ottimizzate

Verifica che i controller usino:
- **Eager loading** per evitare N+1 queries
- **Select specifici** invece di `select('*')`
- **Pagination** per risultati grandi
- **Caching** per dati che cambiano raramente

**Esempio ottimizzato**:

```php
// ❌ NON FARE (carica tutto)
$projects = Project::all();

// ✅ FARE (carica solo necessario)
$projects = Project::select('id', 'title', 'poster', 'category')
    ->with(['technologies:id,name'])
    ->paginate(12);
```

### 5. Caching Strategico

Aggiungi caching per:
- **Categorie** (cambiano raramente) → Cache 1 ora
- **Tecnologie** (cambiano raramente) → Cache 1 ora
- **Progetti pubblici** → Cache 15 minuti
- **Profilo pubblico** → Cache 5 minuti

**Implementazione**:

```php
// In ProjectController
public function index(Request $request) {
    $cacheKey = 'projects:page:' . $request->get('page', 1);
    
    return Cache::remember($cacheKey, 900, function () use ($request) {
        return Project::select('id', 'title', 'poster', 'category')
            ->with(['technologies:id,name'])
            ->paginate(12);
    });
}
```

### 6. Riduzione Payload Response

- Rimuovi campi non necessari nelle response
- Usa **API Resources** di Laravel per formattare output
- Comprimi risposte JSON (gzip in Vercel è automatico)

### 7. Monitoraggio e Logging

Aggiungi logging per identificare:
- Endpoint più lenti
- Query più pesanti
- Cold start frequenti

```php
// In Middleware
Log::info('API Request', [
    'endpoint' => request()->path(),
    'duration' => microtime(true) - LARAVEL_START,
    'memory' => memory_get_usage(true),
]);
```

## 📈 Risultati Attesi

| Metrica | Prima | Dopo | Miglioramento |
|---------|-------|------|---------------|
| Memoria | 2.05 GB | 1 GB | -51% |
| GB-Hrs/mese | 4.6 | ~2.3 | -50% |
| Cold Start | 15.7% | ~10% | -36% |
| Tempo medio esecuzione | ~27s | ~15s | -44% |
| Costo mensile | ~$0.46 | ~$0.23 | -50% |

## 🔄 Passi di Implementazione

1. **Backup configurazione attuale**:
   ```bash
   cp vercel.json vercel.json.backup
   ```

2. **Applica configurazione ottimizzata**:
   ```bash
   cp vercel.optimized.json vercel.json
   ```

3. **Ottimizza api/index.php** con le modifiche proposte

4. **Aggiungi caching** nei controller principali

5. **Deploy su Vercel**:
   ```bash
   vercel --prod
   ```

6. **Monitora per 24-48 ore** e verifica:
   - GB-Hrs utilizzati
   - Tempo di esecuzione
   - Errori/tassi di errore

## ⚠️ Note Importanti

1. **Test in staging prima di produzione**: Verifica che tutto funzioni con 1 GB di memoria
2. **Monitora errori**: Se vedi errori di memoria, aumenta gradualmente (1.5 GB invece di 1 GB)
3. **Cold start**: Il primo deploy dopo 1 ora può avere cold start più lungo, è normale
4. **Database**: Assicurati che le query siano ottimizzate per evitare timeout

## 🔍 Verifica API Utilizzate

Esegui lo script per vedere quali API sono effettivamente utilizzate:

```bash
cd backend
node scripts/analyze-api-usage.js
```

Questo ti dirà quali endpoint sono chiamati dal frontend e quali potrebbero essere rimossi o ottimizzati.

## 📚 Risorse Utili

- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [Laravel Performance Optimization](https://laravel.com/docs/optimization)
- [Vercel Pricing Calculator](https://vercel.com/pricing)

## 🆘 Troubleshooting

### Problema: "Function exceeded maximum duration"
**Soluzione**: Aumenta `maxDuration` a 60 secondi o ottimizza query lente

### Problema: "Out of memory"
**Soluzione**: Aumenta `memory` a 1.5 GB o ottimizza codice

### Problema: Cold start alto
**Soluzione**: 
- Usa regione fissa (`regions: ["iad1"]`)
- Implementa warm-up ping endpoint
- Riduci dipendenze non necessarie

### Problema: Query lente
**Soluzione**: 
- Aggiungi indici database
- Usa eager loading
- Implementa caching

