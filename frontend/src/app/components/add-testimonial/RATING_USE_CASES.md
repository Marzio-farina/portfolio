# Rating System - Use Cases & Conflict Analysis

## ��� Indice
1. [Istruzioni](#istruzioni)
2. [Template Use Case](#template-use-case)
3. [Use Cases da Analizzare](#use-cases-da-analizzare)
4. [Analisi dei Conflitti](#analisi-dei-conflitti)

---

## ��� Istruzioni

### Come Usare Questo File

1. **Descrivi il caso d'uso** nella sezione "Use Cases da Analizzare"
2. **Specifica chiaramente**:
   - Stato iniziale (quanto è stata selezionata, se c'è hover)
   - Azione dell'utente (click, mouse move, etc)
   - Risultato ATTUALE (cosa vedi ora)
   - Risultato DESIDERATO (cosa vorresti vedere)
   - Quale stella è colorata male

3. **Io analizzerò**:
   - La logica TypeScript (ngClass)
   - Le classi CSS applicate
   - I conflitti tra logica e stili
   - Come risolverli

### Esempio Completo:
```
## Use Case #1: [2° stella selezionata]

### ��� Stato Iniziale
- Selezione precedente: 2 stelle
- Hover: No (nessun hover)
- hoverRating: 0
- form.get('rating')?.value: 4

### ��� Azione
L'utente passa il mouse sulla 4° stella

### ��� Risultato ATTUALE
- Stella 1: Giallo scuro (dim)
- Stella 2: Giallo normale (colore tema)
- Stella 3: Giallo scuro (dim)
- Stella 4: Giallo scuro (dim)
- Stella 5: Grigia

### ��� Risultato DESIDERATO
- Stella 1: Giallo normale (colore tema)
- Stella 2: Giallo normale (colore tema)
- Stella 3: Giallo scuro (dim)
- Stella 4: Giallo scuro (dim)
- Stella 5: Grigia

### ��� Problema Identificato
La stella 1 all'hover diventa Giallo scuro e dovrebbe essere di giallo normale insieme alla 2° stella, solo le stelle successive a quella che era la selezione col click precedentemente devono essere di un giallo scuro.
```


## Use Case #[2]: cliccata 4° stella

### ��� Stato Iniziale
- Selezione precedente: 4° stella
- Hover: 2°stella
- hoverRating: [numero]
- form.get('rating')?.value: [numero]

### ��� Azione
l'utente fa l'hover su 2° stella

### ��� Risultato ATTUALE
- Stella 1: Giallo scuro (dim)
- Stella 2: Giallo scuro (dim)
- Stella 3: Grigia
- Stella 4: Giallo scuro (dim)
- Stella 5: Grigia

### ��� Risultato DESIDERATO
- Stella 1: Giallo normale (colore tema)
- Stella 2: Giallo normale (colore tema)
- Stella 3: Giallo scuro (dim)
- Stella 4: Giallo scuro (dim)
- Stella 5: Grigia

### ��� Problema Identificato
- Le stelle a sinistra di quelle in cui si sta facendo l'hover non sono di colore giallo normale.
- Le stelle tra quella in cui e al momento in hover e quella che precedemente si aveva cliccato diventano grige.

---

## ��� Template Use Case

Copia questa struttura per ogni caso:

```markdown
## Use Case #[numero]: [Titolo breve e descrittivo]

### ��� Stato Iniziale
- Selezione precedente: ? stelle (o nulla)
- Hover: SÌ / NO
- hoverRating: [numero]
- form.get('rating')?.value: [numero]

### ��� Azione
[Descrivi esattamente cosa fa l'utente]

### ��� Risultato ATTUALE
- Stella 1: [colore/stato]
- Stella 2: [colore/stato]
- Stella 3: [colore/stato]
- Stella 4: [colore/stato]
- Stella 5: [colore/stato]

### ��� Risultato DESIDERATO
- Stella 1: [colore/stato]
- Stella 2: [colore/stato]
- Stella 3: [colore/stato]
- Stella 4: [colore/stato]
- Stella 5: [colore/stato]

### ��� Problema Identificato
[Quale stella/e sono sbagliate e perché]
```

---

## ��� Use Cases da Analizzare

### Inserisci qui i tuoi use cases problematici:

---

## ��� Analisi dei Conflitti

Una volta che mi darai gli use cases, analizzerò:

### 1. **Logica TypeScript (ngClass)**
```typescript
// Attuale logica per cada stella:
'star-filled': (hoverRating() > 0 
  ? hoverRating() >= [numero stella]
  : (form.get('rating')?.value ?? 0) >= [numero stella]
),
'star-hover': hoverRating() > 0 && hoverRating() >= [numero stella],
'star-dimmed': hoverRating() > 0 
  && (form.get('rating')?.value ?? 0) > hoverRating() 
  && (form.get('rating')?.value ?? 0) >= [numero stella]
```

### 2. **Classi CSS Applicate**
```css
/* Stella Gialla Normale */
.rating-input label.star-filled .star {
  fill: var(--accent-primary);
  stroke: var(--accent-primary);
}

/* Stella Gialla Scura */
.rating-input label.star-dimmed .star {
  fill: rgba(0, 0, 0, 0.1);
  stroke: var(--text-secondary);
  opacity: 0.5;
}

/* Effetto Hover (Scale) */
.rating-input label.star-hover .star {
  transform: scale(1.1);
}

/* Effetto Hover Generale */
.rating-input label:hover .star {
  stroke: var(--accent-primary);
  transform: scale(1.1);
}
```

### 3. **Possibili Conflitti**
- [ ] `star-filled` e `star-dimmed` applicate contemporaneamente?
- [ ] `:hover` CSS override le classi ngClass?
- [ ] `scale(1.1)` da `star-hover` e `:hover` si sommano?
- [ ] Ordine di specificità CSS sbagliato?
- [ ] La logica ngClass non corrisponde al CSS?

---

## ✅ Fase Successiva

Una volta che mi darai gli use cases con:
1. ✅ Stato iniziale chiaro
2. ✅ Azione dell'utente
3. ✅ Risultato attuale
4. ✅ Risultato desiderato
5. ✅ Quale stella è sbagliata

**Io farò**:
1. ��� Traccia passo-passo la logica per ognuno
2. ��� Identifico il conflitto CSS/logica
3. ��� Ti propongo la soluzione
4. ��� Modifico il codice

---

