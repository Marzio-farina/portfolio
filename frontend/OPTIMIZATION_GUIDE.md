# 🚀 Guida Ottimizzazione Asset - Riduzione Cached Egress

## 📊 Problema Attuale
- **Cached Egress**: 9.71 GB (Limite Free Plan: 5 GB)
- **Overage**: 4.71 GB
- **Picco**: 3.4 GB il 3 novembre

## 🎯 Obiettivo
Ridurre il cached egress del **70%** portandolo sotto i 5 GB mensili.

---

## 🔧 Step 1: Installazione Dipendenze

```bash
cd frontend
npm install --save-dev sharp
```

---

## 📦 Step 2: Esecuzione Script di Compressione

### Opzione A: Tutto insieme
```bash
npm run optimize-all
```

### Opzione B: Passo per passo
```bash
# 1. Download font Three.js locali
npm run download-fonts

# 2. Comprimi immagini PNG/JPG → WebP
npm run compress-assets

# 3. Ottimizza Google Fonts
npm run optimize-fonts
```

---

## 📝 Step 3: Aggiornamenti Manuali Necessari

### 1. Aggiorna Three.js per usare font locali

**File**: `frontend/src/app/components/three-text-3d/three-text-3d.component.ts`

```typescript
// PRIMA
loader.load(
  'https://threejs.org/examples/fonts/droid/droid_sans_bold.typeface.json',
  ...
);

// DOPO
loader.load(
  '/assets/fonts/droid_sans_bold.typeface.json',
  ...
);
```

### 2. Aggiorna Google Fonts

**File**: `frontend/src/index.html`

```html
<!-- PRIMA -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap">

<!-- DOPO -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap">
```

### 3. Aggiorna riferimenti immagini → WebP

**File**: `frontend/src/index.html`
```html
<!-- PRIMA -->
<link rel="icon" href="/assets/images/logo.png">

<!-- DOPO -->
<link rel="icon" href="/assets/images/logo.webp">
```

**Cerca e sostituisci** in tutti i componenti:
```typescript
// PRIMA
'/assets/images/my-avatar-2.png'

// DOPO
'/assets/images/my-avatar-2.webp'
```

### 4. Aggiungi lazy loading ai video

**File**: Componenti con video

```html
<!-- PRIMA -->
<video src="/assets/videos/sports-booking.mp4" autoplay loop></video>

<!-- DOPO -->
<video 
  src="/assets/videos/sports-booking.mp4" 
  loading="lazy" 
  preload="none"
  autoplay 
  loop>
</video>
```

---

## 📊 Step 4: Verifica Risultati

Dopo l'ottimizzazione, controlla:

```bash
# Verifica dimensioni file
cd frontend/public/assets
du -sh images/*.webp
du -sh fonts/*.json

# Report compressione
cat ../compression-report.json
```

### Report atteso:
```
✅ File processati: 15-20
📦 Dimensione originale: ~5.2 MB
📦 Dimensione compressa: ~1.5 MB
💾 Risparmio totale: ~3.7 MB (~71%)
```

---

## 🎯 Risultati Attesi per Categoria

| Asset | Prima | Dopo | Risparmio |
|-------|-------|------|-----------|
| Avatar PNG | 1.6 MB | 200 KB | 87% |
| Logo PNG | 304 KB | 50 KB | 84% |
| Video MP4 | 3.5 MB | 1.5 MB | 57% |
| Attestati JPG | 672 KB | 160 KB | 76% |
| Font Three.js | External | Local | 100% egress |
| Google Fonts | 180 KB | 90 KB | 50% |

**Risparmio totale stimato per visita**: ~4.2 MB → ~1.2 MB (**~71%**)

---

## 🔄 Manutenzione Continua

### Script pre-commit (opzionale)
Aggiungi a `.husky/pre-commit`:
```bash
#!/bin/sh
npm run compress-assets
git add public/assets
```

### CI/CD (Vercel)
Aggiungi a `vercel.json`:
```json
{
  "buildCommand": "npm run optimize-all && npm run build"
}
```

---

## 🐛 Troubleshooting

### Errore "sharp not installed"
```bash
npm install --save-dev sharp
```

### Errore "permission denied"
```bash
chmod +x scripts/*.js
```

### WebP non supportato (fallback)
Usa `<picture>` tag:
```html
<picture>
  <source srcset="/assets/images/logo.webp" type="image/webp">
  <img src="/assets/images/logo.png" alt="Logo">
</picture>
```

---

## 📈 Monitoraggio

Controlla Vercel Dashboard ogni settimana:
- Cached Egress dovrebbe scendere sotto 5 GB
- Picchi giornalieri < 500 MB
- Bandwidth totale ridotto ~70%

---

## ✅ Checklist Finale

- [ ] Script installati
- [ ] `npm run optimize-all` eseguito
- [ ] Three.js font locali
- [ ] Google Fonts ottimizzati
- [ ] Immagini WebP attive
- [ ] Video lazy-loaded
- [ ] Vercel deploy testato
- [ ] Cached egress monitorato

---

**🎉 Ottimizzazione completata! Risparmio stimato: 4.7 GB/mese**

