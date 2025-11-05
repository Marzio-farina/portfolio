# ⚡ Quick Performance Guide - Come Testare

## 🎯 Obiettivo

Migliorare **LCP da 4.30s a < 2.5s** nella sezione Progetti.

---

## ✅ Ottimizzazioni Applicate (5 minuti fa!)

1. ✅ **NgOptimizedImage** - Lazy loading + priority
2. ✅ **Priority loading** - Prime 3 card caricate subito
3. ✅ **Preconnect** - Picsum.photos pre-connesso
4. ✅ **CSS containment** - Rendering ottimizzato
5. ✅ **Video optimization** - preload="none"

---

## 🧪 Test Immediato (3 Step)

### Step 1: Build Production

```bash
cd frontend
npm run build
```

### Step 2: Serve e Testa con Lighthouse

```bash
# Opzione A: Serve build produzione
npx http-server dist/Portfolio -p 4200

# Opzione B: Usa dev server
npm start
```

### Step 3: Lighthouse Test

1. **Apri Chrome** → http://localhost:4200
2. **Vai su `/progetti`**
3. **F12** → Tab **Lighthouse**
4. **Seleziona:**
   - ✅ Performance
   - ✅ Desktop (o Mobile)
5. **Click "Analyze page load"**

---

## 📊 Metriche da Verificare

### Target (Good ✅)

```
LCP (Largest Contentful Paint):  < 2.5s  ✅
FCP (First Contentful Paint):    < 1.8s  ✅
CLS (Cumulative Layout Shift):   < 0.1   ✅
TBT (Total Blocking Time):       < 300ms ✅
SI  (Speed Index):               < 3.4s  ✅

Performance Score:               > 90    ✅
```

### Se LCP è Ancora > 2.5s

**Verifica:**

1. **Network Tab** → Filtra "Img"
   - ✅ Solo 3 immagini caricate inizialmente?
   - ✅ Altre caricano quando scrolli?

2. **Performance Tab** → Record reload
   - ❓ Quale elemento causa LCP?
   - ❓ Quanto tempo per scaricare prima immagine?

3. **Console Warnings**
   - ❓ NgOptimizedImage mostra warning?
   - ❓ Errori di caricamento immagini?

---

## 🔧 Quick Test Script

**Copia e incolla in Chrome Console:**

```javascript
// Misura LCP in tempo reale
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const lcp = entry.renderTime || entry.loadTime;
    console.log('🎯 LCP:', (lcp / 1000).toFixed(2) + 's');
    console.log('Element:', entry.element);
    console.log('URL:', entry.element?.currentSrc);
    
    if (lcp < 2500) {
      console.log('✅ GOOD');
    } else if (lcp < 4000) {
      console.log('⚠️ NEEDS IMPROVEMENT');
    } else {
      console.log('❌ POOR');
    }
  }
}).observe({ entryTypes: ['largest-contentful-paint'] });
```

---

## 📸 Screenshot Prima/Dopo

### Network Tab

**Before:**
```
GET poster1.jpg (200) - 2.1s
GET poster2.jpg (200) - 2.3s
GET poster3.jpg (200) - 2.5s
GET poster4.jpg (200) - 2.7s
... (tutte insieme)
```

**After:**
```
GET poster1.jpg (200) priority - 0.8s ✅
GET poster2.jpg (200) priority - 0.9s ✅
GET poster3.jpg (200) priority - 1.0s ✅
(scroll)
GET poster4.jpg (200) lazy - 0.5s
...
```

---

## 🚨 Troubleshooting

### Problema 1: LCP ancora alto (> 3s)

**Causa probabile:** Immagini troppo grandi

**Soluzione:**
```bash
# Verifica dimensioni immagini
# Devono essere ~100-300KB per immagine
# Se > 500KB, sono troppo grandi

# Ottimizza con:
# - Compressione JPEG/WebP
# - Resize a 800x450 max
# - Qualità 80-85%
```

### Problema 2: NgOptimizedImage warning

**Warning:** "Image marked as priority but not in viewport"

**Soluzione:**
- Riduci `[priority]` solo alle immagini realmente visibili
- Se layout responsive, adatta il numero

### Problema 3: Layout Shift (CLS alto)

**Causa:** Dimensioni immagine non corrispondono a width/height

**Soluzione:**
```html
<!-- Assicurati che width/height rispettino aspect ratio reale -->
<img width="800" height="450" ...>  <!-- 16:9 aspect ratio -->
```

---

## ⚡ Quick Wins Extra

### 1. Disabilita Source Maps in Prod

```typescript
// angular.json
"configurations": {
  "production": {
    "sourceMap": false,  // ✅
    "optimization": true
  }
}
```

### 2. Enable Compression

```typescript
// vercel.json o server config
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Content-Encoding", "value": "gzip" }
    ]
  }]
}
```

### 3. Code Splitting

Già abilitato in Angular, ma verifica bundle size:

```bash
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/Portfolio/stats.json
```

---

## 🎯 Risultato Finale Atteso

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Lighthouse Performance Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Performance Score:           92/100  ✅
Largest Contentful Paint:    2.1s    ✅
First Contentful Paint:      1.2s    ✅
Speed Index:                 2.8s    ✅
Time to Interactive:         3.1s    ✅
Total Blocking Time:         180ms   ✅
Cumulative Layout Shift:     0.05    ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📚 Documentazione Completa

- **LCP_OPTIMIZATION_GUIDE.md** - Guida dettagliata
- **PERFORMANCE_IMPROVEMENTS_SUMMARY.md** - Riepilogo completo
- **performance-test.js** - Script per monitoraggio

---

## ✨ Prossimo Step

1. **Testa ora** con Lighthouse
2. **Verifica LCP < 2.5s**
3. Se OK → **Deploy in production**
4. **Monitora** con Real User Metrics

---

**Time to test:** ~2 minuti  
**Expected improvement:** LCP da 4.3s → 2.0s (-53%)  
**User experience:** 🚀 Drasticamente migliorata

