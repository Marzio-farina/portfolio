# 🚀 Script di Ottimizzazione Asset

## Quick Start

```bash
# Installa sharp (già fatto)
npm install

# Esegui tutto in un colpo solo
npm run optimize-all
```

## Script Disponibili

### 1. `npm run compress-assets`
Comprimi immagini PNG/JPG → WebP
- Frontend: `public/assets/images`
- Backend: `storage/app/public/attestati`

### 2. `npm run download-fonts`
Scarica font Three.js localmente
- Evita chiamate esterne
- Riduce cached egress

### 3. `npm run optimize-fonts`
Mostra come ottimizzare Google Fonts
- Riduce pesi da 6 a 3

### 4. `npm run optimize-all`
Esegue tutti gli script in sequenza

## Output

- **Console**: Progress e report dettagliato
- **File**: `compression-report.json` con statistiche

## Prossimi Step

Vedi `OPTIMIZATION_GUIDE.md` per le modifiche manuali necessarie.

