# 🎯 Drag & Drop Riordinamento Repository GitHub

## 📌 Panoramica

È stata implementata la funzionalità di **drag & drop** per riordinare le repository GitHub nel componente `aside-secondary`. Gli utenti autenticati in modalità edit possono ora riorganizzare l'ordine delle repository trascinandole con il mouse.

---

## ✨ Caratteristiche

### Frontend

1. **Cursor Interattivo**
   - 🖐️ Cursor `grab` all'hover in modalità edit
   - ✊ Cursor `grabbing` durante il trascinamento
   - ✅ Nessun cursor drag in modalità non-edit

2. **Animazioni Fluide**
   - Opacità ridotta (50%) durante il drag
   - Leggera riduzione di scala (98%) per feedback visivo
   - Transizioni smooth durante il riordinamento

3. **Eventi HTML5 Drag & Drop**
   - `dragstart` - Inizializza il drag
   - `dragover` - Previene comportamento predefinito
   - `drop` - Esegue il riordinamento
   - `dragend` - Pulisce lo stato

### Backend

1. **Colonna `order`**
   - Aggiunta alla tabella `github_repositories`
   - Tipo: `integer`, default `0`
   - Indicizzata per query veloci

2. **Endpoint di Riordinamento**
   ```
   PUT /api/github-repositories/reorder
   ```
   
   **Payload:**
   ```json
   {
     "order": [
       { "id": 1, "order": 0 },
       { "id": 2, "order": 1 },
       { "id": 3, "order": 2 }
     ]
   }
   ```

3. **Validazione**
   - Autenticazione obbligatoria
   - Verifica che tutte le repository appartengano all'utente
   - Validazione degli ID e degli indici

---

## 🗂️ File Modificati

### Backend

1. **Migration:** `2025_11_01_120921_add_order_to_github_repositories_table.php`
   - Aggiunge colonna `order` (integer, default 0)
   - Crea indice per prestazioni

2. **Model:** `app/Models/GitHubRepository.php`
   - Aggiunto `order` al `$fillable`

3. **Controller:** `app/Http/Controllers/Api/GitHubRepositoryController.php`
   - `index()`: Ordina per `order ASC`, poi `created_at DESC`
   - `updateOrder()`: Nuovo metodo per salvare l'ordine

4. **Route:** `routes/api.php`
   - `PUT github-repositories/reorder` → `GitHubRepositoryController@updateOrder`

### Frontend

1. **Service:** `frontend/src/app/services/github-repository.service.ts`
   - `updateOrder$(order)`: Nuovo metodo per chiamare l'API di riordinamento
   - Aggiunto `order` all'interfaccia `GitHubRepositoryResponse`

2. **Component:** `frontend/src/app/components/aside-secondary/aside-secondary.ts`
   - `draggedIndex`: Signal per tracciare l'elemento trascinato
   - `onDragStart()`: Inizializza il drag
   - `onDragOver()`: Gestisce l'evento dragover
   - `onDrop()`: Esegue il riordinamento locale e salva nel backend
   - `onDragEnd()`: Pulisce lo stato

3. **Template:** `frontend/src/app/components/aside-secondary/aside-secondary.html`
   - Aggiunto `[draggable]="canEdit()"` ai contenitori repository
   - Eventi: `(dragstart)`, `(dragover)`, `(drop)`, `(dragend)`
   - Classi dinamiche: `[class.dragging]`, `[class.draggable-edit]`

4. **Styles:** `frontend/src/app/components/aside-secondary/aside-secondary.css`
   - `.draggable-edit`: Cursor grab
   - `.dragging`: Opacità 50%, scala 98%, cursor grabbing
   - Transizioni smooth per animazioni

---

## 🚀 Come Funziona

### Flusso Utente

1. **Utente entra in modalità edit**
   - Il cursor diventa `grab` all'hover sulle repository

2. **Utente trascina una repository**
   - Il cursor diventa `grabbing`
   - La repository trascinata diventa semi-trasparente

3. **Utente rilascia su un'altra posizione**
   - Le repository vengono riordinate visualmente
   - Il backend salva il nuovo ordine automaticamente

4. **In caso di errore**
   - La lista viene ricaricata dal backend
   - L'utente vede l'ordine corretto

### Flusso Tecnico

1. **Drag Start**
   ```typescript
   onDragStart(event, index) {
     this.draggedIndex.set(index);
     event.dataTransfer.effectAllowed = 'move';
   }
   ```

2. **Drop**
   ```typescript
   onDrop(event, dropIndex) {
     // Riordina array localmente
     const repos = [...this.repositories()];
     const [draggedItem] = repos.splice(dragIndex, 1);
     repos.splice(dropIndex, 0, draggedItem);
     
     // Aggiorna indici order
     const updatedRepos = repos.map((repo, idx) => ({...repo, order: idx}));
     
     // Salva nel backend
     this.githubRepo.updateOrder$(orderData).subscribe(...);
   }
   ```

3. **Backend Update**
   ```php
   public function updateOrder(Request $request) {
     foreach ($orderData as $item) {
       GitHubRepository::where('id', $item['id'])
         ->where('user_id', $user->id)
         ->update(['order' => $item['order']]);
     }
   }
   ```

---

## 🔒 Sicurezza

- ✅ **Autenticazione**: Endpoint protetto con `auth:sanctum`
- ✅ **Autorizzazione**: Verifica che le repository appartengano all'utente
- ✅ **Validazione**: Controlli su ID e ordini
- ✅ **Prevenzione CSRF**: Gestito da Laravel Sanctum

---

## 🧪 Test

### Test Manuale

1. Accedi al portfolio
2. Entra in modalità edit
3. Vai al componente aside-secondary
4. Trascina una repository in una nuova posizione
5. Verifica che l'ordine venga mantenuto dopo il refresh

### Test API

```bash
# Ottieni le repository (con ordine)
curl -X GET http://localhost:8000/api/github-repositories \
  -H "Authorization: Bearer YOUR_TOKEN"

# Riordina le repository
curl -X PUT http://localhost:8000/api/github-repositories/reorder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order": [
      {"id": 1, "order": 2},
      {"id": 2, "order": 0},
      {"id": 3, "order": 1}
    ]
  }'
```

---

## 📝 Note Tecniche

1. **HTML5 Drag & Drop**: Usa API native del browser
2. **Persistenza**: L'ordine viene salvato nel database
3. **Fallback**: In caso di errore, ricarica dal backend
4. **UX**: Feedback visivo chiaro durante il drag
5. **Performance**: Indicizzazione della colonna `order`

---

## 🎨 Stili CSS

```css
/* Cursor grab in edit mode */
.draggable-edit {
  cursor: grab;
}

.draggable-edit:active {
  cursor: grabbing;
}

/* Effetto durante il drag */
.dragging {
  opacity: 0.5;
  transform: scale(0.98);
  cursor: grabbing;
}
```

---

## 🐛 Risoluzione Problemi

### Il drag non funziona
- Verifica di essere in modalità edit
- Controlla che `canEdit()` ritorni `true`
- Verifica che l'attributo `[draggable]` sia presente

### L'ordine non viene salvato
- Controlla i log del browser per errori API
- Verifica che l'utente sia autenticato
- Controlla che il token sia valido

### L'ordine si resetta
- Controlla che la colonna `order` esista nel DB
- Esegui la migration: `php artisan migrate`
- Verifica che il backend restituisca il campo `order`

---

## 📚 Riferimenti

- [HTML5 Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Angular Event Binding](https://angular.dev/guide/templates/event-binding)
- [Laravel Validation](https://laravel.com/docs/validation)
- [CSS cursor Property](https://developer.mozilla.org/en-US/docs/Web/CSS/cursor)

---

**Data Implementazione:** 1 Novembre 2025  
**Versione Angular:** 20  
**Versione Laravel:** 11

