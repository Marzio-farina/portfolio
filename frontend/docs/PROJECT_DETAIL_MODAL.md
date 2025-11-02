# 📋 ProjectDetailModal - Documentazione Completa

## 📑 Indice

1. [Panoramica Generale](#panoramica-generale)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Componente Principale](#componente-principale)
4. [CanvasService](#canvasservice)
5. [Sottocomponenti](#sottocomponenti)
6. [Flusso di Dati](#flusso-di-dati)
7. [Responsive Design](#responsive-design)
8. [Esempi di Utilizzo](#esempi-di-utilizzo)
9. [Guida allo Sviluppo](#guida-allo-sviluppo)

---

## 🌟 Panoramica Generale

Il **ProjectDetailModal** è un componente complesso per la gestione dettagliata dei progetti con funzionalità di editing avanzate, layout responsive personalizzabile per dispositivo e sistema canvas drag & drop.

### Caratteristiche Principali

- ✅ **Edit Mode Dinamico**: Modalità visualizzazione/modifica con preview
- ✅ **Canvas Interattivo**: Drag & drop e resize di elementi
- ✅ **Multi-Device Layout**: Layout personalizzati per dispositivo
- ✅ **Upload Media**: Gestione immagini e video con drag & drop
- ✅ **Custom Elements**: Aggiunta dinamica di testi e immagini
- ✅ **Form Validation**: Validazione completa con notifiche
- ✅ **Responsive Design**: Adattamento automatico su tutti i dispositivi

### Tecnologie Utilizzate

- **Angular 18+** con Signals API
- **TypeScript** con strict mode
- **Standalone Components**
- **Reactive Forms**
- **CSS Modular Architecture**
- **RxJS** per async operations

---

## 🏗️ Architettura del Sistema

### Struttura Complessiva

```
ProjectDetailModal (Orchestrator)
│
├── CanvasService (Business Logic)
│   ├── Drag & Drop Logic
│   ├── Resize Logic
│   ├── Layout Persistence
│   ├── Multi-Device Management
│   └── Custom Elements Management
│
└── UI Components (Presentation Layer)
    ├── DeviceSelectorComponent
    ├── PosterUploaderComponent
    ├── VideoUploaderComponent
    ├── CustomTextElementComponent
    ├── CustomImageElementComponent
    ├── CategoryFieldComponent
    ├── TechnologiesSelectorComponent
    └── DescriptionFieldComponent
```

### Principi Architetturali

1. **Separation of Concerns**: Logica business separata dalla presentazione
2. **Single Responsibility**: Ogni componente ha una responsabilità specifica
3. **DRY Principle**: Zero duplicazione di codice
4. **Dependency Injection**: Uso di Angular DI per servizi
5. **Reactive Programming**: Signals per gestione stato reattiva

### Metriche del Codice

| Componente | Righe TS | Righe CSS | Complessità |
|------------|----------|-----------|-------------|
| ProjectDetailModal | 1081 | 1427 | Alta |
| CanvasService | 956 | - | Alta |
| Sottocomponenti (8) | 709 | ~400 | Bassa-Media |
| **TOTALE** | **2746** | **~1827** | - |

---

## 📦 Componente Principale

### ProjectDetailModal

**Path**: `frontend/src/app/components/project-detail-modal/project-detail-modal.ts`

#### Responsabilità

- Orchestrazione dei sottocomponenti
- Gestione form e validazione
- Coordinamento salvataggio progetto
- Gestione notifiche utente
- Interfaccia con backend API

#### API Pubblica

##### Inputs

```typescript
project = input.required<Progetto>();
```

- **project**: Progetto da visualizzare/modificare (required)

##### Outputs

```typescript
closed = output<void>();
```

- **closed**: Evento emesso alla chiusura del modal

#### Signals Principali

```typescript
// Stati UI
isEditMode: Signal<boolean>         // Modalità edit attiva
isPreviewMode: Signal<boolean>      // Modalità preview attiva
saving: Signal<boolean>             // Salvataggio in corso
isAddToolbarExpanded: Signal<boolean> // Toolbar elementi espansa

// Form & Dati
editForm: FormGroup                 // Form reattivo per editing
categories: Signal<Category[]>      // Categorie disponibili
availableTechnologies: Signal<Technology[]> // Tecnologie disponibili
selectedTechnologyIds: Signal<number[]> // Tecnologie selezionate

// Media Upload
selectedPosterFile: Signal<File | null>   // File poster selezionato
selectedVideoFile: Signal<File | null>    // File video selezionato
videoRemoved: Signal<boolean>             // Video rimosso
aspectRatio: Signal<string | null>        // Aspect ratio immagine
isVerticalImage: Signal<boolean>          // Immagine verticale

// Notifiche
notifications: Signal<Notification[]> // Lista notifiche attive
```

#### Computed Signals

```typescript
canEdit: Signal<boolean>           // Utente può editare (auth + edit mode)
isAuthenticated: Signal<boolean>   // Utente autenticato
canvasHeight: Signal<number>       // Altezza dinamica canvas
viewportHeight: Signal<number>     // Altezza viewport
```

#### Metodi Principali

##### Gestione Dispositivi

```typescript
onDeviceSelected(device: DevicePreset): void
```
Gestisce la selezione di un dispositivo preset.

```typescript
selectDeviceByScreenWidth(): void
```
Seleziona automaticamente il dispositivo in base alla larghezza schermo.

##### Gestione Upload

```typescript
onPosterSelected(data: PosterData): void
```
Gestisce la selezione del poster.

```typescript
onVideoSelected(data: VideoData): void
```
Gestisce la selezione del video.

```typescript
onVideoRemoved(): void
```
Gestisce la rimozione del video.

##### Custom Elements

```typescript
addCustomText(): void
```
Inizia la modalità creazione elemento testo.

```typescript
addCustomImage(): void
```
Inizia la modalità creazione elemento immagine.

```typescript
onCustomTextContentChanged(elementId: string, content: string): void
```
Aggiorna il contenuto di un elemento testo.

```typescript
onCustomImageSelected(data: CustomImageData): void
```
Gestisce la selezione di un'immagine custom.

```typescript
removeCustomElement(itemId: string): void
```
Rimuove un elemento custom dal canvas.

##### Canvas Interaction

```typescript
onItemMouseDown(event: MouseEvent, itemId: string): void
```
Inizia il drag di un elemento canvas.

```typescript
onResizeMouseDown(event: MouseEvent, itemId: string, handle: string): void
```
Inizia il resize di un elemento canvas.

```typescript
onCanvasMouseMove(event: MouseEvent): void
onCanvasMouseDown(event: MouseEvent): void
onCanvasMouseUp(event: MouseEvent): void
```
Gestiscono la creazione drag-to-draw di elementi.

##### Save & Validation

```typescript
onSave(): void
```
Salva le modifiche al progetto con validazione completa.

```typescript
private cleanEmptyCustomElements(): void
```
Rimuove elementi custom vuoti prima del salvataggio.

```typescript
private saveCanvasLayout(): void
```
Salva il layout canvas con debounce (500ms).

##### Utilities

```typescript
isItemOutsideViewport(itemId: string): boolean
```
Verifica se un elemento è fuori dal viewport.

```typescript
togglePreviewMode(): void
```
Alterna tra modalità edit e preview.

```typescript
toggleAddToolbar(): void
```
Apre/chiude la toolbar per aggiungere elementi.

#### Lifecycle Hooks

```typescript
constructor()
```
- Inizializza form reattivo
- Configura effects per auto-selezione dispositivo
- Carica categorie e tecnologie
- Setup listener per layout changes

```typescript
ngOnDestroy(): void
```
- Cleanup event listeners globali
- Reset del CanvasService
- Pulizia risorse

#### File CSS

1. **project-detail-modal-base.css** (83 righe)
   - Struttura base del modal
   - Layout dialog
   - Overlay e backdrop

2. **project-detail-modal-form.css** (133 righe)
   - Stili form inputs
   - Buttons e actions
   - Field validations

3. **project-detail-modal-canvas-devices.css** (769 righe)
   - Canvas e elementi
   - Device selector
   - Toolbar elementi custom
   - Upload areas

4. **project-detail-modal.responsive.css** (442 righe)
   - Media queries
   - Breakpoints responsive
   - Layout mobile/tablet/desktop

---

## ⚙️ CanvasService

**Path**: `frontend/src/app/services/canvas.service.ts`

### Responsabilità

Il **CanvasService** è il cuore della logica canvas, gestendo:
- Drag & drop di elementi
- Resize interattivo
- Layout multi-dispositivo
- Persistenza configurazioni
- Adattamento automatico layout
- Elementi custom (testo/immagini)

### Interfaces Esportate

#### CanvasItem

```typescript
interface CanvasItem {
  id: string;              // ID univoco elemento
  left: number;            // Posizione X in pixel
  top: number;             // Posizione Y in pixel
  width: number;           // Larghezza in pixel
  height: number;          // Altezza in pixel
  type?: 'image' | 'video' | 'category' | 'technologies' | 
         'description' | 'custom-text' | 'custom-image';
  content?: string;        // Contenuto (per custom elements)
}
```

#### DragState

```typescript
interface DragState {
  isDragging: boolean;     // Drag in corso
  draggedItemId: string | null;  // ID elemento draggato
  startX: number;          // Posizione mouse iniziale X
  startY: number;          // Posizione mouse iniziale Y
  startItemX: number;      // Posizione elemento iniziale X
  startItemY: number;      // Posizione elemento iniziale Y
}
```

#### ResizeState

```typescript
interface ResizeState {
  isResizing: boolean;     // Resize in corso
  itemId: string | null;   // ID elemento resizato
  handle: string | null;   // Handle utilizzato (nw, ne, sw, se)
  startX: number;          // Posizione mouse iniziale X
  startY: number;          // Posizione mouse iniziale Y
  startLeft: number;       // Left iniziale elemento
  startTop: number;        // Top iniziale elemento
  startWidth: number;      // Width iniziale elemento
  startHeight: number;     // Height iniziale elemento
}
```

### Device Presets

```typescript
devicePresets: DevicePreset[] = [
  { id: 'mobile-small', name: 'Mobile S', width: 375, height: 667, icon: '📱' },
  { id: 'mobile', name: 'Mobile', width: 414, height: 896, icon: '📱' },
  { id: 'tablet', name: 'Tablet', width: 768, height: 1024, icon: '📱' },
  { id: 'desktop', name: 'Desktop', width: 1920, height: 1080, icon: '💻' },
  { id: 'desktop-wide', name: 'Wide', width: 2560, height: 1440, icon: '🖥️' }
];
```

### Signals Pubblici

```typescript
// Dispositivo selezionato
selectedDevice: WritableSignal<DevicePreset>

// Layout per tutti i dispositivi
deviceLayouts: WritableSignal<Map<string, Map<string, CanvasItem>>>

// Items del dispositivo corrente
canvasItems: Signal<Map<string, CanvasItem>>

// Stati interazione
dragState: WritableSignal<DragState>
resizeState: WritableSignal<ResizeState>

// Creazione elementi
isCreatingElement: WritableSignal<'text' | 'image' | null>
drawStartPos: WritableSignal<{ x: number; y: number } | null>
drawCurrentPos: WritableSignal<{ x: number; y: number } | null>
cursorPos: WritableSignal<{ x: number; y: number }>
```

### Metodi Pubblici

#### Gestione Dispositivi

```typescript
selectDevice(device: DevicePreset): void
```
Seleziona un dispositivo e carica/crea il suo layout.

```typescript
getDeviceLayout(deviceId: string): Map<string, CanvasItem>
```
Ottiene il layout per un dispositivo specifico.

```typescript
setDeviceLayout(deviceId: string, layout: Map<string, CanvasItem>): void
```
Imposta il layout per un dispositivo specifico.

#### Gestione Canvas Items

```typescript
getItemStyle(itemId: string): { left: number; top: number; width: number; height: number }
```
Ottiene lo stile inline per un elemento.

```typescript
updateCanvasItem(itemId: string, updates: Partial<CanvasItem>): void
```
Aggiorna un elemento del canvas.

```typescript
addCanvasItem(item: CanvasItem): void
```
Aggiunge un nuovo elemento al canvas.

```typescript
removeCanvasItem(itemId: string): void
```
Rimuove un elemento dal canvas.

#### Drag & Drop

```typescript
startDrag(event: MouseEvent, itemId: string): void
```
Inizia il drag di un elemento.
- Disabilitato su mobile (< 768px)
- Previene drag su resize handles
- Registra listener globali

```typescript
private handleDragMove(event: MouseEvent): void
```
Gestisce il movimento durante il drag.
- Calcola delta movimento
- Applica bounds checking
- Aggiorna posizione elemento

```typescript
private finalizeDrag(): void
```
Finalizza il drag e cleanup listeners.

#### Resize

```typescript
startResize(event: MouseEvent, itemId: string, handle: string): void
```
Inizia il resize di un elemento.
- Disabilitato su mobile (< 768px)
- Supporta 4 handles: nw, ne, sw, se
- Registra listener globali

```typescript
private handleResizeMove(event: MouseEvent): void
```
Gestisce il movimento durante il resize.
- Calcola nuove dimensioni in base all'handle
- Applica dimensioni minime (100x30px)
- Previene overflow canvas

```typescript
private finalizeResize(): void
```
Finalizza il resize e cleanup listeners.

#### Custom Elements

```typescript
addCustomText(left: number, top: number, width: number, height: number): string
```
Aggiunge un elemento testo custom.
- Genera ID univoco
- Contenuto inizialmente vuoto
- Ritorna l'ID generato

```typescript
addCustomImage(left: number, top: number, width: number, height: number): string
```
Aggiunge un elemento immagine custom.
- Genera ID univoco
- URL inizialmente vuoto
- Ritorna l'ID generato

```typescript
updateCustomElementContent(itemId: string, content: string): void
```
Aggiorna il contenuto di un elemento custom.

```typescript
cleanEmptyCustomElements(): void
```
Rimuove elementi custom senza contenuto.
- Eseguito prima del salvataggio
- Pulisce testi vuoti e immagini senza URL

#### Drag-to-Draw

```typescript
startElementCreation(type: 'text' | 'image'): void
```
Inizia la modalità creazione elemento.

```typescript
startDrawing(x: number, y: number): void
```
Inizia il disegno del rettangolo.

```typescript
updateDrawing(x: number, y: number): void
```
Aggiorna il disegno durante il movimento mouse.

```typescript
finalizeDrawing(): string | null
```
Finalizza il disegno e crea l'elemento.
- Dimensioni minime: 50x30px
- Ritorna l'ID del nuovo elemento o null se troppo piccolo

```typescript
cancelElementCreation(): void
```
Annulla la creazione elemento.

```typescript
updateCursorPosition(x: number, y: number): void
```
Aggiorna posizione cursore (per preview icona).

#### Layout Persistence

```typescript
loadCanvasLayout(layoutConfigJson: string | null): void
```
Carica il layout dal JSON.
- Supporta formato multi-dispositivo
- Supporta formato legacy (single device)
- Crea layout default per dispositivi mancanti
- Gestione errori con fallback

```typescript
saveCanvasLayout(projectId: number): void
```
Salva il layout sul server con debounce (500ms).
- Serializza tutti i layout dispositivi
- Invia richiesta PATCH al backend
- Include type e content per custom elements

```typescript
saveCanvasLayoutImmediate(projectId: number): void
```
Salva il layout immediatamente senza debounce.

```typescript
validateItemBounds(canvasWidth: number): void
```
Valida e adatta gli elementi alla larghezza canvas.
- Riduce larghezza elementi che escono
- Sposta elementi se necessario
- Mantiene dimensioni minime (100px)

#### Layout Adaptation

```typescript
getAdaptedLayoutForDevice(
  targetDeviceId: string, 
  layouts: Map<string, Map<string, CanvasItem>>,
  customTargetWidth?: number
): Map<string, CanvasItem> | null
```
Adatta il layout di un dispositivo più largo al target.

**Algoritmo**:
1. Trova il dispositivo più largo con layout salvato
2. Scala proporzionalmente tutti gli elementi
3. Applica reflow per elementi che escono
4. Valida dimensioni minime

**Parametri**:
- `targetDeviceId`: ID dispositivo target
- `layouts`: Mappa di tutti i layout
- `customTargetWidth`: Larghezza custom (opzionale)

**Ritorna**: Layout adattato o null se non possibile

```typescript
private reflowItems(items: CanvasItem[], maxWidth: number): CanvasItem[]
```
Riposiziona elementi che escono dal dispositivo.

**Algoritmo**:
1. Raggruppa elementi per riga (tolleranza 30px)
2. Per ogni riga, dispone elementi da sinistra
3. Se elemento esce, va a capo
4. Mantiene gap di 20px tra elementi

```typescript
isItemOutsideViewport(itemId: string): boolean
```
Verifica se un elemento è fuori dal viewport.

**Controlli**:
- Completamente fuori (left >= width o top >= height)
- Parzialmente fuori (right > width o bottom > height)

```typescript
private validateSingleItemBounds(config: {...}): {...}
```
Valida dimensioni e posizioni minime di un singolo item.
- Larghezza minima: 150px
- Posizioni non negative

#### Cleanup

```typescript
reset(): void
```
Reset completo del servizio.
- Reset tutti i signals ai valori default
- Cleanup event listeners globali
- Reset counter elementi custom
- Chiamato in ngOnDestroy del componente

### Architettura Interna

```
CanvasService
│
├── State Management (Signals)
│   ├── selectedDevice
│   ├── deviceLayouts
│   ├── dragState
│   ├── resizeState
│   └── isCreatingElement
│
├── Interaction Layer
│   ├── Drag & Drop Handlers
│   ├── Resize Handlers
│   └── Drawing Handlers
│
├── Business Logic
│   ├── Layout Adaptation Algorithm
│   ├── Reflow Algorithm
│   ├── Bounds Validation
│   └── Multi-Device Management
│
└── Persistence Layer
    ├── Load from Backend
    ├── Save to Backend (debounced)
    └── JSON Serialization
```

---

## 🧩 Sottocomponenti

### 1. DeviceSelectorComponent

**Path**: `frontend/src/app/components/device-selector/device-selector.component.ts`

#### Responsabilità
- Visualizzazione dispositivi disponibili
- Selezione dispositivo corrente
- Dialog dimensioni custom
- Animazioni hover

#### API

**Inputs:**
```typescript
selectedDevice: DevicePreset  // Dispositivo correntemente selezionato
devicePresets: DevicePreset[] // Lista dispositivi disponibili
```

**Outputs:**
```typescript
deviceSelected: EventEmitter<DevicePreset>  // Emesso alla selezione dispositivo
saveLayoutRequest: EventEmitter<void>       // Richiesta salvataggio layout
```

#### Features
- 📱 Icone dispositivi animate
- ↔️ Espansione/contrazione fluida all'hover
- 🎨 Bordo colorato tema principale
- ⚙️ Dialog custom per dimensioni personalizzate
- 🔄 Animazione frecce laterali

#### CSS Struttura
```css
.device-selector {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 2px solid rgba(128, 128, 128, 0.4);
  transition: all 0.4s ease;
}

.device-selector:hover {
  border-color: var(--accent-primary);
}

.device-btn:not(.active) {
  max-width: 0;
  opacity: 0;
  transition: max-width 0.4s ease, opacity 0.3s ease;
}

.device-selector:hover .device-btn:not(.active) {
  max-width: 150px;
  opacity: 1;
}
```

---

### 2. PosterUploaderComponent

**Path**: `frontend/src/app/components/poster-uploader/poster-uploader.component.ts`

#### Responsabilità
- Upload immagine poster
- Drag & drop files
- Preview immagine
- Calcolo aspect ratio

#### API

**Inputs:**
```typescript
posterUrl: string | undefined      // URL immagine esistente
isEditMode: boolean                // Modalità edit attiva
saving: boolean                    // Salvataggio in corso
```

**Outputs:**
```typescript
posterSelected: EventEmitter<PosterData>     // File selezionato
aspectRatioCalculated: EventEmitter<{        // Aspect ratio calcolato
  ratio: string;
  isVertical: boolean;
}>
```

**Types:**
```typescript
interface PosterData {
  file: File;           // File selezionato
  previewUrl: string;   // URL preview locale
}
```

#### Features
- 🖼️ Preview immagine real-time
- 📤 Drag & drop upload
- 🎯 Click per selezionare file
- 📏 Calcolo automatico aspect ratio
- ⚠️ Gestione errori caricamento
- 🎨 Hover effect con icona centrale

#### Upload Flow
```
1. User drag file o click
   ↓
2. Validazione tipo file (image/*)
   ↓
3. Creazione URL preview (FileReader)
   ↓
4. Caricamento immagine
   ↓
5. Calcolo aspect ratio
   ↓
6. Emissione eventi
```

---

### 3. VideoUploaderComponent

**Path**: `frontend/src/app/components/video-uploader/video-uploader.component.ts`

#### Responsabilità
- Upload video
- Drag & drop con validazione
- Preview video player
- Progress indicator

#### API

**Inputs:**
```typescript
videoUrl: string | undefined       // URL video esistente
isEditMode: boolean                // Modalità edit attiva
saving: boolean                    // Salvataggio in corso
```

**Outputs:**
```typescript
videoSelected: EventEmitter<VideoData>  // Video selezionato
```

**Types:**
```typescript
interface VideoData {
  file: File;           // File video
  previewUrl: string;   // URL preview
  removed: boolean;     // Video rimosso
}
```

#### Features
- 🎬 Video player integrato
- 📤 Drag & drop upload
- ✅ Validazione tipo file (video/*)
- ❌ Indicatore file non valido
- 📊 Progress bar caricamento
- 🎯 Click per selezionare file
- 🗑️ Gestione rimozione video

#### Validazione Drag
```typescript
// Valida tipo file durante drag
const hasVideoFile = Array.from(items).some(item => 
  item.kind === 'file' && item.type.startsWith('video/')
);

if (hasVideoFile) {
  // Mostra overlay "Rilascia per caricare"
} else {
  // Mostra indicatore "File non valido"
}
```

---

### 4. CustomTextElementComponent

**Path**: `frontend/src/app/components/custom-text-element/custom-text-element.component.ts`

#### Responsabilità
- Display/edit testo custom
- Textarea auto-expanding
- Preview testo

#### API

**Inputs:**
```typescript
content: string        // Contenuto testuale
isEditMode: boolean   // Modalità edit attiva
saving: boolean       // Salvataggio in corso
```

**Outputs:**
```typescript
contentChanged: EventEmitter<string>  // Contenuto modificato
```

#### Features
- ✏️ Textarea per editing
- 👁️ Display read-only in view mode
- 🔄 Auto-save on change
- 📝 Placeholder "Inserisci il testo."
- 🚫 Previene drag durante editing

#### Template
```html
<!-- Edit Mode -->
<textarea 
  [value]="content()"
  (input)="onContentChange($event)"
  (mousedown)="$event.stopPropagation()"
  placeholder="Inserisci il testo."
  class="custom-text-input">
</textarea>

<!-- View Mode -->
<div class="custom-text-display">
  {{ content() }}
</div>
```

---

### 5. CustomImageElementComponent

**Path**: `frontend/src/app/components/custom-image-element/custom-image-element.component.ts`

#### Responsabilità
- Upload immagine custom
- Drag & drop
- Preview immagine
- Placeholder quando vuota

#### API

**Inputs:**
```typescript
elementId: string          // ID univoco elemento
imageUrl: string | undefined  // URL immagine esistente
isEditMode: boolean        // Modalità edit attiva
saving: boolean            // Salvataggio in corso
```

**Outputs:**
```typescript
imageSelected: EventEmitter<CustomImageData>  // Immagine selezionata
```

**Types:**
```typescript
interface CustomImageData {
  elementId: string;    // ID elemento
  file: File;          // File immagine
  previewUrl: string;  // URL preview
}
```

#### Features
- 🖼️ Preview immagine
- 📤 Drag & drop upload
- 🎯 Click per selezionare
- 🎨 Hover effect con icona
- 📏 Fit immagine nel container
- 🚫 Previene drag durante upload

---

### 6. CategoryFieldComponent

**Path**: `frontend/src/app/components/category-field/category-field.component.ts`

#### Responsabilità
- Selezione categoria progetto
- Display categoria attuale
- Loading state

#### API

**Inputs:**
```typescript
selectedCategoryId: number | null     // ID categoria selezionata
categories: Category[]                // Categorie disponibili
currentCategory: string | undefined   // Nome categoria corrente
isEditMode: boolean                   // Modalità edit attiva
loading: boolean                      // Caricamento in corso
```

**Outputs:**
```typescript
categoryChanged: EventEmitter<number>  // Categoria selezionata
```

**Types:**
```typescript
interface Category {
  id: number;
  title: string;
  slug: string;
  icon: string;
}
```

#### Features
- 📋 Select dropdown in edit mode
- 👁️ Display label in view mode
- ⏳ Loading indicator
- 🔴 Indicatore campo required
- 🚫 Previene drag durante selezione

#### Template Structure
```html
<div class="category-field">
  <label>
    Categoria:
    <span class="required" *ngIf="isEditMode">*</span>
  </label>
  
  <!-- Edit Mode -->
  <select *ngIf="isEditMode" 
    [value]="selectedCategoryId()" 
    (change)="onCategoryChange($event)">
    <option value="">Seleziona una categoria</option>
    <option *ngFor="let cat of categories()" 
      [value]="cat.id">
      {{ cat.icon }} {{ cat.title }}
    </option>
  </select>
  
  <!-- View Mode -->
  <span *ngIf="!isEditMode">
    {{ currentCategory() || 'N/A' }}
  </span>
</div>
```

---

### 7. TechnologiesSelectorComponent

**Path**: `frontend/src/app/components/technologies-selector/technologies-selector.component.ts`

#### Responsabilità
- Selezione multiple tecnologie
- Checkbox grid
- Display tags tecnologie

#### API

**Inputs:**
```typescript
availableTechnologies: Technology[]   // Tecnologie disponibili
selectedTechnologyIds: number[]       // IDs tecnologie selezionate
projectTechnologies: Technology[]     // Tecnologie del progetto
isEditMode: boolean                   // Modalità edit attiva
loading: boolean                      // Caricamento in corso
```

**Outputs:**
```typescript
technologyToggled: EventEmitter<number>  // Tecnologia toggled
```

**Types:**
```typescript
interface Technology {
  id: number;
  name: string;
  icon_url?: string;
  color?: string;
}
```

#### Features
- ☑️ Multi-select con checkboxes
- 🏷️ Display tags colorate
- 🎨 Icone tecnologie
- 📱 Grid responsive
- ⏳ Loading state
- 🚫 Previene drag durante selezione

#### Layout
```css
.technologies-selector__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.technologies-selector__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.technologies-selector__tag {
  padding: 4px 12px;
  border-radius: 12px;
  background: var(--tech-color, var(--accent-primary));
}
```

---

### 8. DescriptionFieldComponent

**Path**: `frontend/src/app/components/description-field/description-field.component.ts`

#### Responsabilità
- Editing descrizione progetto
- Textarea auto-expanding
- Conteggio caratteri

#### API

**Inputs:**
```typescript
description: string               // Descrizione corrente
currentDescription: string        // Descrizione salvata
isEditMode: boolean              // Modalità edit attiva
```

**Outputs:**
```typescript
descriptionChanged: EventEmitter<string>  // Descrizione modificata
```

#### Features
- ✏️ Textarea con auto-resize
- 📏 Max length 1000 caratteri
- 👁️ Display paragrafo in view mode
- 🔴 Indicatore required (solo edit)
- 🚫 Previene drag durante editing

#### Template
```html
<div class="description-field">
  <label>
    Descrizione:
    <span class="required" *ngIf="isEditMode()">*</span>
  </label>
  
  <!-- Edit Mode -->
  <textarea *ngIf="isEditMode()"
    [value]="description()"
    (input)="onDescriptionChange($event)"
    (mousedown)="$event.stopPropagation()"
    maxlength="1000"
    placeholder="Descrivi il progetto...">
  </textarea>
  
  <!-- View Mode -->
  <p *ngIf="!isEditMode()">
    {{ currentDescription() || 'Nessuna descrizione' }}
  </p>
</div>
```

---

## 🔄 Flusso di Dati

### Inizializzazione Componente

```
1. App Component
   ├── Open ProjectDetailModal
   └── Pass project input
       ↓
2. ProjectDetailModal Constructor
   ├── Initialize FormGroup
   ├── Load Categories (HTTP)
   ├── Load Technologies (HTTP)
   └── Setup Effects
       ↓
3. Effect: Load Layout
   ├── Check if layout exists
   ├── Convert to JSON if needed
   └── Call canvasService.loadCanvasLayout()
       ↓
4. CanvasService
   ├── Parse JSON layout
   ├── Create layout maps
   ├── Set default for missing devices
   └── Update deviceLayouts signal
       ↓
5. UI Render
   ├── Canvas items positioned
   ├── Form populated
   └── Subcomponents rendered
```

### Editing Flow

```
1. User enters Edit Mode
   ├── canEdit() = true
   └── isEditMode() = true
       ↓
2. Canvas becomes interactive
   ├── Drag handles visible
   ├── Resize handles visible
   └── Add toolbar visible
       ↓
3. User modifies layout
   ├── Drag element
   │   ├── canvasService.startDrag()
   │   ├── canvasService.handleDragMove()
   │   └── canvasService.finalizeDrag()
   │       └── saveCanvasLayout() (debounced 500ms)
   │
   ├── Resize element
   │   ├── canvasService.startResize()
   │   ├── canvasService.handleResizeMove()
   │   └── canvasService.finalizeResize()
   │       └── saveCanvasLayout() (debounced 500ms)
   │
   └── Add custom element
       ├── User clicks "Testo" or "Immagine"
       ├── canvasService.startElementCreation()
       ├── User draws rectangle on canvas
       ├── canvasService.finalizeDrawing()
       └── saveCanvasLayout() (debounced 500ms)
```

### Save Flow

```
1. User clicks "Salva"
   ├── onSave() triggered
   └── Form validation
       ↓
2. Clean empty custom elements
   ├── canvasService.cleanEmptyCustomElements()
   └── Remove texts without content
       ↓
3. Prepare FormData
   ├── Add form fields
   ├── Add poster file (if selected)
   └── Add video file (if selected)
       ↓
4. HTTP PATCH Request
   ├── /api/projects/{id}
   ├── Upload files (multipart/form-data)
   └── Update project data
       ↓
5. Save canvas layout
   ├── canvasService.saveCanvasLayoutImmediate()
   ├── HTTP PATCH /api/projects/{id}/layout
   └── Send multi-device layout JSON
       ↓
6. Success feedback
   ├── Show success notification
   ├── Refresh project data
   └── Close modal (optional)
```

### Device Switch Flow

```
1. User selects device
   ├── DeviceSelector emits deviceSelected
   └── onDeviceSelected(device) called
       ↓
2. Check if layout exists
   ├── Yes: Load existing layout
   └── No: Create from adapted layout
       ↓
3. CanvasService.selectDevice()
   ├── Set selectedDevice signal
   └── Update canvasItems computed
       ↓
4. Check if layout needs adaptation
   ├── getAdaptedLayoutForDevice()
   │   ├── Find larger device with layout
   │   ├── Scale proportionally
   │   ├── Reflow elements
   │   └── Validate bounds
   │       ↓
5. UI Updates
   ├── Canvas resized to device dimensions
   ├── Elements repositioned
   └── Viewport adjusted
```

### Upload Media Flow

```
1. User uploads poster
   ├── PosterUploader: drag or click
   ├── Validate file type (image/*)
   ├── Create preview URL (FileReader)
   ├── Load image and calculate aspect ratio
   └── Emit posterSelected event
       ↓
2. ProjectDetailModal.onPosterSelected()
   ├── Set selectedPosterFile signal
   ├── Set aspectRatio signal
   └── Set isVerticalImage signal
       ↓
3. User uploads video
   ├── VideoUploader: drag or click
   ├── Validate file type (video/*)
   ├── Create preview URL (FileReader)
   ├── Show progress bar
   └── Emit videoSelected event
       ↓
4. ProjectDetailModal.onVideoSelected()
   ├── Set selectedVideoFile signal
   └── Set videoRemoved signal (false)
       ↓
5. On Save
   ├── Files attached to FormData
   └── Uploaded to server
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile Small: < 768px */
@media (max-width: 768px) {
  /* Layout verticale forzato */
  /* Disabilita drag & resize */
  /* Toolbar mobile */
}

/* Tablet: 768px - 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  /* Layout adattivo */
  /* Drag & resize limitato */
}

/* Desktop: 1024px - 1250px */
@media (min-width: 1024px) and (max-width: 1250px) {
  /* Full features */
  /* Buttons in dialog */
}

/* Desktop Large: > 1250px */
@media (min-width: 1250px) {
  /* Desktop actions bar */
  /* Preview button visible */
  /* Optimized spacing */
}
```

### Adattamenti per Dispositivo

#### Mobile (< 768px)
- ❌ Drag & drop disabilitato
- ❌ Resize disabilitato
- ✅ Layout verticale automatico
- ✅ Touch-friendly buttons
- ✅ Full-screen modal
- ✅ Toolbar in dialog footer

#### Tablet (768px - 1024px)
- ✅ Drag & drop abilitato
- ✅ Resize abilitato
- ✅ Layout responsive
- ✅ Device selector visible
- ⚠️ Limiti dimensioni elementi

#### Desktop (> 1024px)
- ✅ Full features
- ✅ Desktop actions bar
- ✅ Preview button (> 1250px)
- ✅ Device selector centered
- ✅ Optimized interactions

### Auto-Device Selection

Il componente seleziona automaticamente il dispositivo in base alla larghezza dello schermo in **view mode**:

```typescript
selectDeviceByScreenWidth(): void {
  const screenWidth = window.innerWidth;
  
  // Trova il dispositivo più vicino
  const closestDevice = this.canvasService.devicePresets
    .reduce((closest, device) => {
      const currentDiff = Math.abs(device.width - screenWidth);
      const closestDiff = Math.abs(closest.width - screenWidth);
      return currentDiff < closestDiff ? device : closest;
    });
    
  this.canvasService.selectedDevice.set(closestDevice);
}
```

**Eseguito in:**
- Component initialization (view mode)
- Window resize (view mode)
- Exit from edit mode

---

## 💡 Esempi di Utilizzo

### Esempio 1: Apertura Modal Base

```typescript
// app.component.ts
import { ProjectDetailModal } from './components/project-detail-modal';

@Component({
  // ...
  imports: [ProjectDetailModal]
})
export class AppComponent {
  selectedProject = signal<Progetto | null>(null);
  
  openProjectDetail(project: Progetto) {
    this.selectedProject.set(project);
    this.isProjectDetailModalOpen.set(true);
  }
  
  onProjectDetailClosed() {
    this.isProjectDetailModalOpen.set(false);
    // Refresh project data if needed
    this.loadProjects();
  }
}
```

```html
<!-- app.component.html -->
@if (isProjectDetailModalOpen() && selectedProject()) {
  <app-project-detail-modal
    [project]="selectedProject()!"
    (closed)="onProjectDetailClosed()">
  </app-project-detail-modal>
}
```

### Esempio 2: Editing Progetto

```typescript
// Con permessi edit
editProject(project: Progetto) {
  // 1. Attiva edit mode
  this.editModeService.setEditing(true);
  
  // 2. Apri modal
  this.openProjectDetail(project);
  
  // Modal sarà in edit mode perché:
  // - isAuthenticated() = true (utente loggato)
  // - isEditing() = true (edit mode attivo)
  // quindi canEdit() = true
}
```

### Esempio 3: Aggiungere Custom Text

```typescript
// project-detail-modal.ts
addCustomText(): void {
  if (!this.isEditMode()) return;
  
  // 1. Inizia modalità creazione
  this.canvasService.startElementCreation('text');
  
  // 2. Chiudi toolbar
  this.isAddToolbarExpanded.set(false);
}

// User draws rectangle on canvas
onCanvasMouseUp(event: MouseEvent): void {
  // 3. Crea elemento con dimensioni disegnate
  const newId = this.canvasService.finalizeDrawing();
  
  if (newId) {
    // 4. Salva layout
    this.saveCanvasLayout();
  }
}
```

### Esempio 4: Upload Poster

```typescript
// poster-uploader.component.ts
onFileSelected(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  // Crea preview
  const reader = new FileReader();
  reader.onload = () => {
    this.previewUrl.set(reader.result as string);
    
    // Emetti evento
    this.posterSelected.emit({
      file: file,
      previewUrl: reader.result as string
    });
  };
  reader.readAsDataURL(file);
}
```

### Esempio 5: Device Layout Adaptation

```typescript
// canvas.service.ts
getAdaptedLayoutForDevice(
  targetDeviceId: string,
  layouts: Map<...>
): Map<string, CanvasItem> | null {
  
  // 1. Trova source device (più largo)
  const sourceDevice = this.findLargerDevice(targetDeviceId);
  if (!sourceDevice) return null;
  
  // 2. Calcola scala
  const scaleX = targetDevice.width / sourceDevice.width;
  const scaleY = targetDevice.height / sourceDevice.height;
  
  // 3. Scala elementi
  const scaledItems = sourceLayout.map(item => ({
    ...item,
    left: Math.round(item.left * scaleX),
    top: Math.round(item.top * scaleY),
    width: Math.round(item.width * scaleX),
    height: Math.round(item.height * scaleY)
  }));
  
  // 4. Reflow elementi che escono
  return this.reflowItems(scaledItems, targetDevice.width);
}
```

### Esempio 6: Save con Validazione

```typescript
async onSave(): Promise<void> {
  // 1. Pulisci elementi vuoti
  this.cleanEmptyCustomElements();
  
  // 2. Valida form
  if (!this.editForm.valid) {
    this.addNotification('error', 'Compila tutti i campi obbligatori');
    return;
  }
  
  // 3. Prepara dati
  const formData = new FormData();
  formData.append('title', this.editForm.value.title);
  
  // 4. Aggiungi files
  if (this.selectedPosterFile()) {
    formData.append('poster', this.selectedPosterFile()!);
  }
  
  // 5. Salva progetto
  this.saving.set(true);
  this.http.patch(`/api/projects/${projectId}`, formData)
    .subscribe({
      next: () => {
        // 6. Salva layout
        this.canvasService.saveCanvasLayoutImmediate(projectId);
        
        // 7. Success feedback
        this.addNotification('success', 'Progetto salvato!');
        this.saving.set(false);
      },
      error: (err) => {
        this.addNotification('error', 'Errore salvataggio');
        this.saving.set(false);
      }
    });
}
```

---

## 🛠️ Guida allo Sviluppo

### Setup Ambiente

```bash
# Clone repository
git clone <repo-url>

# Install dependencies
cd frontend
npm install

# Run development server
npm start
```

### Struttura Directory

```
frontend/src/app/
├── components/
│   ├── project-detail-modal/
│   │   ├── project-detail-modal.ts         (1081 righe)
│   │   ├── project-detail-modal.html       (467 righe)
│   │   ├── project-detail-modal-base.css   (83 righe)
│   │   ├── project-detail-modal-form.css   (133 righe)
│   │   ├── project-detail-modal-canvas-devices.css (769 righe)
│   │   └── project-detail-modal.responsive.css (442 righe)
│   │
│   ├── device-selector/
│   │   ├── device-selector.component.ts
│   │   ├── device-selector.component.html
│   │   └── device-selector.component.css
│   │
│   ├── poster-uploader/
│   ├── video-uploader/
│   ├── custom-text-element/
│   ├── custom-image-element/
│   ├── category-field/
│   ├── technologies-selector/
│   └── description-field/
│
└── services/
    └── canvas.service.ts (956 righe)
```

### Convenzioni Codice

#### Naming

```typescript
// Signals: camelCase
isEditMode = signal(false);
selectedDevice = signal(...);

// Computed: camelCase
canvasHeight = computed(...);

// Methods: camelCase con verb
onSave(): void
updateCanvasItem(...): void
getItemStyle(...): {...}

// Interfaces: PascalCase
interface CanvasItem { ... }
interface DragState { ... }

// Components: PascalCase + "Component"
class DeviceSelectorComponent { ... }
class PosterUploaderComponent { ... }
```

#### File Organization

```typescript
// 1. Imports
import { Component, ... } from '@angular/core';
import { Service } from './services';
import { Interface } from './interfaces';

// 2. Interfaces/Types
interface LocalInterface { ... }
type LocalType = ...;

// 3. Component Decorator
@Component({
  selector: 'app-...',
  standalone: true,
  imports: [...],
  templateUrl: '...',
  styleUrls: [...]
})

// 4. Class Definition
export class Component {
  // 4.1 Injections
  private service = inject(Service);
  
  // 4.2 Inputs/Outputs
  input = input.required<T>();
  output = output<T>();
  
  // 4.3 Signals
  state = signal<T>(initialValue);
  
  // 4.4 Computed
  derived = computed(() => ...);
  
  // 4.5 Constructor
  constructor() { ... }
  
  // 4.6 Lifecycle Hooks
  ngOnInit() { ... }
  ngOnDestroy() { ... }
  
  // 4.7 Public Methods
  publicMethod(): void { ... }
  
  // 4.8 Private Methods
  private privateMethod(): void { ... }
}
```

### Testing

#### Unit Test Template

```typescript
// component.spec.ts
describe('ProjectDetailModal', () => {
  let component: ProjectDetailModal;
  let canvasService: CanvasService;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProjectDetailModal],
      providers: [CanvasService]
    });
    
    component = TestBed.createComponent(ProjectDetailModal).componentInstance;
    canvasService = TestBed.inject(CanvasService);
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should initialize with default device', () => {
    expect(canvasService.selectedDevice().id).toBe('desktop');
  });
  
  it('should update layout on device change', () => {
    const mobileDevice = canvasService.devicePresets[0];
    component.onDeviceSelected(mobileDevice);
    
    expect(canvasService.selectedDevice()).toEqual(mobileDevice);
  });
  
  // ... more tests
});
```

#### Integration Test Example

```typescript
it('should save project with custom elements', fakeAsync(() => {
  // Setup
  component.isEditMode.set(true);
  
  // Add custom text
  component.addCustomText();
  const textId = canvasService.finalizeDrawing();
  
  // Update content
  component.updateCustomElementContent(textId, 'Test content');
  
  // Save
  component.onSave();
  tick(500); // debounce
  
  // Verify
  expect(httpMock.expectOne('/api/projects/1').request.method).toBe('PATCH');
  expect(canvasService.canvasItems().get(textId)?.content).toBe('Test content');
}));
```

### Debugging

#### Console Logs (Development)

```typescript
// Attiva debug logs in sviluppo
if (!environment.production) {
  console.log('[Canvas] Device changed:', device);
  console.log('[Canvas] Layout adapted:', layout);
}
```

#### Angular DevTools

```typescript
// Esponi signals per debugging
if (!environment.production) {
  (window as any).canvasService = this.canvasService;
  (window as any).component = this;
}

// Accesso da console:
// window.canvasService.canvasItems()
// window.component.isEditMode()
```

#### Performance Monitoring

```typescript
// Monitora performance drag & drop
private handleDragMove = (event: MouseEvent): void => {
  const startTime = performance.now();
  
  // ... drag logic ...
  
  const duration = performance.now() - startTime;
  if (duration > 16) { // > 1 frame (60fps)
    console.warn(`[Performance] Drag slow: ${duration}ms`);
  }
};
```

### Best Practices

#### ✅ DO

```typescript
// Use signals for reactive state
isEditMode = signal(false);

// Use computed for derived state
canEdit = computed(() => this.isAuthenticated() && this.isEditing());

// Cleanup in ngOnDestroy
ngOnDestroy(): void {
  this.canvasService.reset();
  document.removeEventListener(...);
}

// Use untracked for effects
effect(() => {
  const project = this.project();
  untracked(() => {
    this.loadLayout(project.layout_config);
  });
});

// Type everything
private processLayout(config: LayoutConfig): Map<string, CanvasItem> {
  // ...
}
```

#### ❌ DON'T

```typescript
// Don't use any
private data: any; // ❌

// Don't mutate signals directly
this.items().set('key', value); // ❌
this.items.set(new Map(this.items()).set('key', value)); // ✅

// Don't forget cleanup
ngOnDestroy() {
  // ❌ Missing listeners cleanup
}

// Don't mix computed and side effects
computed(() => {
  const items = this.items();
  this.saveToServer(items); // ❌ Side effect in computed
  return items;
});
```

### Performance Optimization

#### Debouncing

```typescript
// Debounce save operations
private saveTimeout: any;

saveCanvasLayout(): void {
  clearTimeout(this.saveTimeout);
  this.saveTimeout = setTimeout(() => {
    this.actualSave();
  }, 500);
}
```

#### Virtual Scrolling

```typescript
// Per liste lunghe (future improvement)
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

// Template
<cdk-virtual-scroll-viewport itemSize="50">
  <div *cdkVirtualFor="let item of items()">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
```

#### Change Detection

```typescript
// OnPush strategy per sottocomponenti
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubComponent { }
```

#### Lazy Loading

```typescript
// Lazy load modal
const ProjectDetailModal = await import('./project-detail-modal').then(
  m => m.ProjectDetailModal
);
```

### Troubleshooting

#### Problema: Layout non si salva

**Causa**: Debounce troppo aggressivo o errore HTTP

**Soluzione**:
```typescript
// Usa save immediate se necessario
saveCanvasLayoutImmediate(projectId);

// Verifica errori HTTP
this.http.patch(...).subscribe({
  error: (err) => console.error('Save failed:', err)
});
```

#### Problema: Drag non funziona su mobile

**Causa**: Eventi touch non gestiti

**Soluzione**: Il drag è intenzionalmente disabilitato su mobile (< 768px) per UX migliore.

#### Problema: Elementi escono dal canvas

**Causa**: Bounds validation non applicata

**Soluzione**:
```typescript
// Forza validazione bounds
canvasService.validateItemBounds(canvasWidth);
```

#### Problema: Memory leak

**Causa**: Event listeners non rimossi

**Soluzione**:
```typescript
ngOnDestroy(): void {
  // Cleanup completo
  this.canvasService.reset();
  document.removeEventListener('mousemove', this.handler);
  clearTimeout(this.saveTimeout);
}
```

---

## 📚 Riferimenti

### API Backend

```
GET    /api/projects/:id              - Ottieni progetto
PATCH  /api/projects/:id              - Aggiorna progetto
PATCH  /api/projects/:id/layout       - Aggiorna layout
GET    /api/categories                - Lista categorie
GET    /api/technologies              - Lista tecnologie
```

### TypeScript References

- [Angular Signals](https://angular.io/guide/signals)
- [Standalone Components](https://angular.io/guide/standalone-components)
- [Reactive Forms](https://angular.io/guide/reactive-forms)

### CSS Architecture

- [BEM Methodology](http://getbem.com/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)

---

## 📝 Changelog

### v2.0.0 - Complete Refactor (Current)
- ✅ Estratto CanvasService
- ✅ Creati 8 sottocomponenti
- ✅ Rimossa duplicazione codice
- ✅ Implementato multi-device layout
- ✅ Aggiunto drag-to-draw
- ✅ Migliorato responsive design
- ✅ Signals API completa

### v1.0.0 - Initial Implementation
- Componente monolitico (1912 righe)
- Layout fisso
- Edit mode base

---

## 👥 Contributors

- Sviluppatore principale: [Your Name]
- Architecture: [Team Lead]
- Review: [Senior Developer]

---

## 📄 License

Questo progetto è proprietà di [Your Company]. Tutti i diritti riservati.

---

**Ultima modifica**: Novembre 2024  
**Versione documentazione**: 2.0.0

