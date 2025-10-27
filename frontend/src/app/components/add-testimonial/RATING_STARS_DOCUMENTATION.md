# Sistema di Valutazione con Stelle - Documentazione Tecnica

## ��� Indice
1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Logica di Stato](#logica-di-stato)
4. [HTML e Classi Dinamiche](#html-e-classi-dinamiche)
5. [Stili CSS](#stili-css)
6. [TypeScript e Signal](#typescript-e-signal)
7. [Comportamento Utente](#comportamento-utente)
8. [Esempi Pratici](#esempi-pratici)

---

## ��� Panoramica

Il sistema di valutazione con stelle è un componente interattivo che permette all'utente di:
- **Selezionare una valutazione** (1-5 stelle) cliccando su una stella
- **Visualizzare l'anteprima** dell'hover mouse sopra le stelle (simulazione)
- **Distinguere** tra valutazione selezionata e hover effect con colori diversi

### Stati Visivi

```
Nessuna selezione + nessun hover:
⭐ ⭐ ⭐ ⭐ ⭐  (tutte grigie)

Selezionata 2 stelle + nessun hover:
⭐ ⭐ ⭐ ⭐ ⭐  (2 gialle, 3 grigie)

Selezionata 4 stelle + hover su stella 2:
⭐ ⭐ ⭐ ⭐ ⭐  (1-2 giallo normale, 3-4 giallo scuro, 5 grigia)
```

---

## ���️ Architettura

### Componenti Principali

1. **Signal hoverRating** (TypeScript)
   - Traccia quale stella è attualmente in hover
   - Valori: 0 (nessun hover) o 1-5 (numero stella)

2. **Form Control rating** (TypeScript)
   - Contiene il valore della stella selezionata
   - Valori: 0 (nessuna selezione) o 1-5 (numero stella)

3. **Classi CSS Dinamiche** (HTML + CSS)
   - `star-filled`: stella colorata del colore principale
   - `star-dimmed`: stella colorata con tonalità più scura
   - `star-hover`: indicatore di hover (aggiunge animazione scale)

---

## ��� Logica di Stato

### Due Livelli di Selezione

#### Livello 1: Selezione Permanente (rating)
```typescript
// Form Control
rating: [3, [Validators.required, Validators.min(1), Validators.max(5)]]
// Valore: 0-5 (utente ha cliccato su una stella)
```

#### Livello 2: Hover Temporaneo (hoverRating)
```typescript
// Signal
hoverRating = signal<number>(0);
// Valore: 0 (nessun hover) o 1-5 (stella in hover)
```

### Priorità Logica

1. Se `hoverRating > 0` → mostra l'anteprima dell'hover
2. Se `hoverRating = 0` → mostra la selezione permanente
3. Combina entrambi per visualizzare le stelle oltre l'hover in colore scuro

---

## ��� HTML e Classi Dinamiche

### Struttura HTML di Una Stella

```html
<input type="radio" name="rating" [value]="2" formControlName="rating" id="rating-2"/>
<label for="rating-2" 
  (mouseenter)="hoverRating.set(2)" 
  (mouseleave)="hoverRating.set(0)" 
  [ngClass]="{
    'star-filled': (hoverRating() > 0 ? hoverRating() >= 2 : (form.get('rating')?.value ?? 0) >= 2),
    'star-hover': hoverRating() > 0 && hoverRating() >= 2,
    'star-dimmed': hoverRating() > 0 && (form.get('rating')?.value ?? 0) > hoverRating() && (form.get('rating')?.value ?? 0) >= 2
  }">
  <svg class="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <polygon points="12 2 15.09 10.26 24 10.35 17.82 16.54 20.91 24 12 18.81 3.09 24 6.18 16.54 0 10.35 8.91 10.26 12 2"></polygon>
  </svg>
</label>
```

### Logica ngClass Dettagliata

Usando la stella 2 come esempio:

#### 1. `star-filled`
```typescript
'star-filled': (hoverRating() > 0 
  ? hoverRating() >= 2              // Se sto hovering: colora se hover >= 2
  : (form.get('rating')?.value ?? 0) >= 2  // Altrimenti: colora se selezione >= 2
)
```
**Risultato:** Stella è gialla quando è selezionata O quando la raggiungi con l'hover

#### 2. `star-hover`
```typescript
'star-hover': hoverRating() > 0 && hoverRating() >= 2
```
**Risultato:** Indicatore di hover (aggiunge ingrandimento scale con CSS)

#### 3. `star-dimmed`
```typescript
'star-dimmed': hoverRating() > 0           // Solo durante hover
  && (form.get('rating')?.value ?? 0) > hoverRating()  // La selezione è OLTRE l'hover
  && (form.get('rating')?.value ?? 0) >= 2  // Questa stella era selezionata
```
**Risultato:** Stella diventa scura quando è stata selezionata ma l'hover è prima di essa

---

## ��� Stili CSS

### Stella Normale (Giallo Principale)
```css
.rating-input label.star-filled .star {
  fill: var(--accent-primary);        /* Colore tema: giallo */
  stroke: var(--accent-primary);      /* Bordo: giallo */
}
```

### Stella Scura (Tonalità più Scura)
```css
.rating-input label.star-dimmed .star {
  fill: rgba(0, 0, 0, 0.1);           /* Riempimento scuro semi-trasparente */
  stroke: var(--text-secondary);      /* Bordo grigio */
  opacity: 0.5;                       /* Ridotta trasparenza */
}

/* Override quando star-dimmed è anche in hover */
.rating-input label.star-dimmed:hover .star {
  transform: scale(1.1);              /* Ingrandimento hover */
}
```

### Effetto Hover
```css
.rating-input label:hover .star {
  stroke: var(--accent-primary);      /* Sottolinea con il colore tema */
  transform: scale(1.1);              /* Ingrandisce la stella */
}
```

### Stella Grigia (Non Toccata)
```css
/* Nessuna classe applicata - mantiene lo stile di default */
.rating-input label .star {
  fill: none;
  stroke: var(--text-secondary);      /* Grigio */
}
```

---

## ��� TypeScript e Signal

### Dichiarazione del Signal

```typescript
// Nel componente AddTestimonial
export class AddTestimonial {
  // Signal che traccia l'hover
  hoverRating = signal<number>(0);
  
  // Form control per la valutazione
  form = this.fb.group({
    rating: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    // ... altri campi
  });
}
```

### Event Handlers

```typescript
// In HTML: (mouseenter)="hoverRating.set(2)"
// → Imposta hoverRating a 2 quando il mouse entra sulla stella 2

// In HTML: (mouseleave)="hoverRating.set(0)"
// → Resetta hoverRating a 0 quando il mouse esce dalla stella
```

---

## ��� Comportamento Utente

### Scenario 1: Clic su Stella
```
Azione: User clicca sulla stella 2
Evento: Input radio value cambia a 2
Risultato: form.get('rating')?.value = 2
Visuale: Stelle 1-2 diventano gialle, 3-5 grigie
```

### Scenario 2: Hover senza Selezione
```
Azione: User passa mouse sulla stella 3 (nessuna selezione precedente)
Evento: mouseenter su stella 3 → hoverRating.set(3)
Risultato: hoverRating() = 3
Visuale: Stelle 1-3 gialle (simulazione), 4-5 grigie
         Stella 3 ingrandita (scale 1.1)
```

### Scenario 3: Hover con Selezione Precedente
```
Azione: User aveva selezionato stella 4, passa mouse sulla stella 2
Evento: mouseenter su stella 2 → hoverRating.set(2)
Risultato: hoverRating() = 2, rating = 4
Visuale:
  - Stella 1-2: gialle normali (star-filled da hover)
  - Stella 3-4: gialle scure (star-dimmed - oltre hover ma selezionate)
  - Stella 5: grigia (nessuna classe)
```

### Scenario 4: Mouse Esce dalle Stelle
```
Azione: User esce dalle stelle
Evento: mouseleave → hoverRating.set(0)
Risultato: hoverRating() = 0
Visuale: Ritorna la selezione permanente
```

---

## ��� Esempi Pratici

### Esempio 1: Nessuna Selezione, Hover su Stella 3

```
rating = 0
hoverRating = 3

Stella 1:
  - star-filled: hoverRating(3) > 0 && 3 >= 1? SÌ → star-filled ✓
  - star-hover: hoverRating(3) > 0 && 3 >= 1? SÌ → star-hover ✓
  - star-dimmed: hoverRating(3) > 0 && 0 > 3 && 0 >= 1? NO → ✗
  → Visuale: GIALLA

Stella 2:
  - star-filled: hoverRating(3) > 0 && 3 >= 2? SÌ → star-filled ✓
  - star-hover: hoverRating(3) > 0 && 3 >= 2? SÌ → star-hover ✓
  - star-dimmed: NO
  → Visuale: GIALLA

Stella 3:
  - star-filled: hoverRating(3) > 0 && 3 >= 3? SÌ → star-filled ✓
  - star-hover: hoverRating(3) > 0 && 3 >= 3? SÌ → star-hover ✓
  - star-dimmed: NO
  → Visuale: GIALLA INGRANDITA ← HOVER

Stella 4:
  - star-filled: hoverRating(3) > 0 && 3 >= 4? NO → ✗
  - star-hover: NO
  - star-dimmed: hoverRating(3) > 0 && 0 > 3 && 0 >= 4? NO → ✗
  → Visuale: GRIGIA

Stella 5:
  → Visuale: GRIGIA
```

### Esempio 2: Selezione 4, Hover su Stella 2

```
rating = 4
hoverRating = 2

Stella 1:
  - star-filled: hoverRating(2) > 0 ? 2 >= 1 : 4 >= 1 = SÌ → star-filled ✓
  - star-hover: hoverRating(2) > 0 && 2 >= 1? SÌ → star-hover ✓
  - star-dimmed: hoverRating(2) > 0 && 4 > 2 && 4 >= 1? SÌ
    → MA star-filled ha priorità visuale
  → Visuale: GIALLA NORMALE

Stella 2:
  - star-filled: hoverRating(2) > 0 ? 2 >= 2 : 4 >= 2 = SÌ → star-filled ✓
  - star-hover: hoverRating(2) > 0 && 2 >= 2? SÌ → star-hover ✓
  - star-dimmed: hoverRating(2) > 0 && 4 > 2 && 4 >= 2? SÌ
    → MA star-filled ha priorità visuale
  → Visuale: GIALLA NORMALE INGRANDITA ← HOVER

Stella 3:
  - star-filled: hoverRating(2) > 0 ? 2 >= 3 : 4 >= 3 = NO
    → star-filled ✗
  - star-hover: hoverRating(2) > 0 && 2 >= 3? NO → ✗
  - star-dimmed: hoverRating(2) > 0 && 4 > 2 && 4 >= 3? SÌ → star-dimmed ✓
  → Visuale: GIALLA SCURA

Stella 4:
  - star-filled: NO
  - star-hover: NO
  - star-dimmed: hoverRating(2) > 0 && 4 > 2 && 4 >= 4? SÌ → star-dimmed ✓
  → Visuale: GIALLA SCURA

Stella 5:
  - star-filled: NO
  - star-hover: NO
  - star-dimmed: hoverRating(2) > 0 && 4 > 2 && 4 >= 5? NO → ✗
  → Visuale: GRIGIA
```

---

## ��� Flusso Logico Completo

```
┌─────────────────────────────────────┐
│  Utente Interagisce (click/hover)   │
└─────────────────┬───────────────────┘
                  │
        ┌─────────▼─────────┐
        │  hoverRating      │
        │  viene aggiornato │
        │  al valore della  │
        │  stella in hover  │
        └─────────┬─────────┘
                  │
        ┌─────────▼──────────────┐
        │  ngClass Valuta:       │
        │  - star-filled?        │
        │  - star-hover?         │
        │  - star-dimmed?        │
        └─────────┬──────────────┘
                  │
        ┌─────────▼──────────────────┐
        │  CSS Applica Stili:        │
        │  - Colore giallo normale   │
        │  - Colore giallo scuro     │
        │  - Scale(1.1) per hover    │
        └─────────┬──────────────────┘
                  │
        ┌─────────▼──────────────────┐
        │  Utente Vede:              │
        │  - Stella colorata         │
        │  - Simulazione hover       │
        └────────────────────────────┘
```

---

## ��� Note Importanti

### Specificity CSS
- `star-filled` ha colore **normale** (giallo tema)
- `star-dimmed` ha colore **scuro**
- Quando entrambe le classi sono applicate:
  - Se NON in hover: `star-filled` vince (mostra giallo)
  - Se in hover: `star-filled` vince comunque ma `star-hover` aggiunge animazione

### Validazione Utente
- Minimo: 1 stella
- Massimo: 5 stelle
- Richiesto: SÌ (validator.required)

### Accessibilità
- Usa radio input nativo per compatibilità screen reader
- Label associato a input tramite `for/id`
- SVG stella ha `stroke-width="1.5"` per visibilità

---

## ��� Futuri Miglioramenti

Possibili estensioni del sistema:
1. Animazioni di transizione più elaborate
2. Feedback sonoro all'hover
3. Valutazioni semi-piene (es: 3.5 stelle)
4. Tooltip con descrizione di ogni valutazione
5. Salvataggio della valutazione in tempo reale

