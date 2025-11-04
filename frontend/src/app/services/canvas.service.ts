import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../core/api/api-url';
import { DevicePreset } from '../components/device-selector/device-selector.component';
import { TextStyle } from '../components/text-formatting-toolbar/text-formatting-toolbar.component';
import { Progetto } from '../components/progetti-card/progetti-card';

// ================== Interfaces ==================

export interface CanvasItem {
  id: string;
  left: number;    // posizione X in pixel
  top: number;     // posizione Y in pixel
  width: number;   // larghezza in pixel
  height: number;  // altezza in pixel
  type?: 'image' | 'video' | 'category' | 'technologies' | 'description' | 'custom-text' | 'custom-image';
  content?: string; // Contenuto per elementi custom (testo o URL immagine)
  textStyle?: TextStyle; // Stili del testo per elementi custom-text
  isDeviceSpecific?: boolean; // Se true, elemento visibile SOLO sul dispositivo corrente
}

export interface DeviceLayout {
  deviceId: string;
  items: Map<string, CanvasItem>;
}

export interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  startX: number;
  startY: number;
  startItemX: number;
  startItemY: number;
}

export interface ResizeState {
  isResizing: boolean;
  itemId: string | null;
  handle: string | null;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
}

/**
 * Servizio per gestire la logica del canvas con drag & drop, resize e layout persistence
 */
@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private http: HttpClient;

  // ================== Presets Dispositivi ==================
  
  devicePresets: DevicePreset[] = [
    { id: 'mobile-small', name: 'Mobile S', width: 375, height: 667, icon: '📱' },
    { id: 'mobile', name: 'Mobile', width: 414, height: 896, icon: '📱' },
    { id: 'tablet', name: 'Tablet', width: 768, height: 1024, icon: '📱' },
    { id: 'desktop', name: 'Desktop', width: 1920, height: 1080, icon: '💻' },
    { id: 'desktop-wide', name: 'Wide', width: 2560, height: 1440, icon: '🖥️' }
  ];

  // ================== Signals ==================

  // Dispositivo attualmente selezionato
  selectedDevice = signal<DevicePreset>(this.devicePresets[3]); // Default: desktop

  // Layout multipli per dispositivi diversi (include TUTTI gli elementi: predefiniti E custom)
  deviceLayouts = signal<Map<string, Map<string, CanvasItem>>>(new Map());

  // Canvas items per il dispositivo corrente
  canvasItems = computed(() => {
    const deviceId = this.selectedDevice().id;
    return this.deviceLayouts().get(deviceId) || new Map<string, CanvasItem>();
  });

  // Stato drag
  dragState = signal<DragState>({
    isDragging: false,
    draggedItemId: null,
    startX: 0,
    startY: 0,
    startItemX: 0,
    startItemY: 0
  });

  // Stato resize
  resizeState = signal<ResizeState>({
    isResizing: false,
    itemId: null,
    handle: null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startWidth: 0,
    startHeight: 0
  });

  // Stato per la creazione drag-to-draw di elementi
  isCreatingElement = signal<'text' | 'image' | 'video' | null>(null);
  drawStartPos = signal<{ x: number; y: number } | null>(null);
  drawCurrentPos = signal<{ x: number; y: number } | null>(null);
  cursorPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layout predefinito
  private defaultLayout = new Map<string, CanvasItem>([
    ['image', { id: 'image', type: 'image', left: 20, top: 20, width: 400, height: 320 }],
    ['video', { id: 'video', type: 'video', left: 440, top: 20, width: 400, height: 320 }],
    ['category', { id: 'category', type: 'category', left: 20, top: 360, width: 200, height: 120 }],
    ['technologies', { id: 'technologies', type: 'technologies', left: 240, top: 360, width: 200, height: 120 }],
    ['description', { id: 'description', type: 'description', left: 460, top: 360, width: 380, height: 240 }]
  ]);

  // Counter per ID univoci di elementi custom
  private customElementCounter = 0;

  // Timeout per debounce del salvataggio
  private saveLayoutTimeout: any = null;

  constructor(http: HttpClient) {
    this.http = http;
  }

  // ================== Metodi Dispositivi ==================

  /**
   * Seleziona un dispositivo e carica il suo layout
   */
  selectDevice(device: DevicePreset): void {
    this.selectedDevice.set(device);
    
    // Se non esiste un layout per questo dispositivo, crealo dal default
    const layouts = this.deviceLayouts();
    if (!layouts.has(device.id)) {
      const newLayouts = new Map(layouts);
      newLayouts.set(device.id, new Map(this.defaultLayout));
      this.deviceLayouts.set(newLayouts);
    }
  }

  /**
   * Ottiene il layout per un dispositivo specifico
   */
  getDeviceLayout(deviceId: string): Map<string, CanvasItem> {
    return this.deviceLayouts().get(deviceId) || new Map();
  }

  /**
   * Imposta il layout per un dispositivo specifico
   */
  setDeviceLayout(deviceId: string, layout: Map<string, CanvasItem>): void {
    const layouts = new Map(this.deviceLayouts());
    layouts.set(deviceId, layout);
    this.deviceLayouts.set(layouts);
  }

  // ================== Metodi Canvas Items ==================

  /**
   * Ottiene lo stile inline per un elemento del canvas
   */
  getItemStyle(itemId: string): { left: number; top: number; width: number; height: number } {
    const item = this.canvasItems().get(itemId);
    return item || { left: 0, top: 0, width: 200, height: 150 };
  }

  /**
   * Aggiorna un elemento del canvas
   * @param forceChangeDetection - se true, forza il change detection (default: true)
   */
  updateCanvasItem(itemId: string, updates: Partial<CanvasItem>, forceChangeDetection: boolean = true): void {
    const deviceId = this.selectedDevice().id;
    const layouts = new Map(this.deviceLayouts());
    const currentLayout = new Map(layouts.get(deviceId) || new Map());
    
    const existingItem = currentLayout.get(itemId);
    if (existingItem) {
      const updatedItem = { ...existingItem, ...updates };
      currentLayout.set(itemId, updatedItem);
      layouts.set(deviceId, currentLayout);
      
      this.deviceLayouts.set(layouts);
    }
  }

  /**
   * Aggiunge un nuovo elemento al canvas del dispositivo corrente
   */
  addCanvasItem(item: CanvasItem): void {
    const deviceId = this.selectedDevice().id;
    const layouts = new Map(this.deviceLayouts());
    const currentLayout = new Map(layouts.get(deviceId) || new Map());
    
    // Verifica che non esista già (previene duplicati)
    if (currentLayout.has(item.id)) {
      return;
    }
    
    currentLayout.set(item.id, item);
    layouts.set(deviceId, currentLayout);
    this.deviceLayouts.set(layouts);
  }

  /**
   * Rimuove un elemento dal canvas
   * - Elementi custom (custom-text, custom-image): rimossi da TUTTI i dispositivi
   * - Elementi predefiniti: rimossi solo dal dispositivo corrente
   */
  removeCanvasItem(itemId: string): void {
    const layouts = new Map(this.deviceLayouts());
    
    // Se è un elemento custom, rimuovilo da TUTTI i dispositivi
    if (itemId.startsWith('custom-')) {
      for (const device of this.devicePresets) {
        const currentLayout = new Map(layouts.get(device.id) || new Map());
        currentLayout.delete(itemId);
        layouts.set(device.id, currentLayout);
      }
    } else {
      // Elemento predefinito: rimuovi solo dal dispositivo corrente
      const deviceId = this.selectedDevice().id;
      const currentLayout = new Map(layouts.get(deviceId) || new Map());
      currentLayout.delete(itemId);
      layouts.set(deviceId, currentLayout);
    }
    
    // Forza il change detection creando una nuova Map
    this.deviceLayouts.set(new Map(layouts));
  }

  // ================== Drag & Drop ==================

  /**
   * Inizia il drag di un elemento
   */
  startDrag(event: MouseEvent, itemId: string): void {
    // Disabilita drag su mobile (< 768px)
    if (window.innerWidth <= 768) return;
    
    // Se clicca su un resize handle, non fare drag
    const target = event.target as HTMLElement;
    if (target.classList.contains('resize-handle')) return;
    
    event.preventDefault();
    event.stopPropagation();

    const item = this.canvasItems().get(itemId);
    if (!item) return;

    this.dragState.set({
      isDragging: true,
      draggedItemId: itemId,
      startX: event.clientX,
      startY: event.clientY,
      startItemX: item.left,
      startItemY: item.top
    });

    // Aggiungi listener globali per drag
    document.addEventListener('mousemove', this.handleDragMove);
    document.addEventListener('mouseup', this.finalizeDrag);
  }

  /**
   * Gestisce il movimento durante il drag
   */
  private handleDragMove = (event: MouseEvent): void => {
    const state = this.dragState();
    if (!state.isDragging || !state.draggedItemId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    let newLeft = state.startItemX + deltaX;
    let newTop = state.startItemY + deltaY;

    // Limita ai bordi del canvas
    newLeft = Math.max(0, newLeft);
    newTop = Math.max(0, newTop);

    // Aggiorna con change detection per movimento fluido
    this.updateCanvasItem(state.draggedItemId, {
      left: newLeft,
      top: newTop
    }, true);
  };

  /**
   * Finalizza il drag
   */
  private finalizeDrag = (): void => {
    if (this.dragState().isDragging) {
      const draggedId = this.dragState().draggedItemId;
      
      this.dragState.set({
        isDragging: false,
        draggedItemId: null,
        startX: 0,
        startY: 0,
        startItemX: 0,
        startItemY: 0
      });

      // Forza il change detection alla fine del drag
      if (draggedId) {
        this.deviceLayouts.set(new Map(this.deviceLayouts()));
      }

      // Rimuovi listener globali
      document.removeEventListener('mousemove', this.handleDragMove);
      document.removeEventListener('mouseup', this.finalizeDrag);
    }
  };

  // ================== Resize ==================

  /**
   * Inizia il resize di un elemento
   */
  startResize(event: MouseEvent, itemId: string, handle: string): void {
    // Disabilita resize su mobile (< 768px)
    if (window.innerWidth <= 768) return;
    
    event.preventDefault();
    event.stopPropagation();

    const item = this.canvasItems().get(itemId);
    if (!item) return;

    this.resizeState.set({
      isResizing: true,
      itemId,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: item.left,
      startTop: item.top,
      startWidth: item.width,
      startHeight: item.height
    });

    // Aggiungi listener globali per resize
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.finalizeResize);
  }

  /**
   * Gestisce il movimento durante il resize
   */
  private handleResizeMove = (event: MouseEvent): void => {
    const state = this.resizeState();
    if (!state.isResizing || !state.itemId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    let newLeft = state.startLeft;
    let newTop = state.startTop;
    let newWidth = state.startWidth;
    let newHeight = state.startHeight;

    // Calcola nuove dimensioni in base all'handle
    switch (state.handle) {
      // Lati singoli
      case 'n': // Nord (sopra) - riduce altezza, sposta top
        newTop = state.startTop + deltaY;
        newHeight = state.startHeight - deltaY;
        break;
      case 's': // Sud (sotto) - aumenta altezza
        newHeight = state.startHeight + deltaY;
        break;
      case 'e': // Est (destra) - aumenta larghezza
        newWidth = state.startWidth + deltaX;
        break;
      case 'w': // Ovest (sinistra) - riduce larghezza, sposta left
        newLeft = state.startLeft + deltaX;
        newWidth = state.startWidth - deltaX;
        break;
      
      // Angoli
      case 'nw':
        newLeft = state.startLeft + deltaX;
        newTop = state.startTop + deltaY;
        newWidth = state.startWidth - deltaX;
        newHeight = state.startHeight - deltaY;
        break;
      case 'ne':
        newTop = state.startTop + deltaY;
        newWidth = state.startWidth + deltaX;
        newHeight = state.startHeight - deltaY;
        break;
      case 'sw':
        newLeft = state.startLeft + deltaX;
        newWidth = state.startWidth - deltaX;
        newHeight = state.startHeight + deltaY;
        break;
      case 'se':
        newWidth = state.startWidth + deltaX;
        newHeight = state.startHeight + deltaY;
        break;
    }

    // Applica dimensioni minime
    const minWidth = 100;
    const minHeight = 30;

    if (newWidth < minWidth) {
      newWidth = minWidth;
      // Se ridimensiona da sinistra (w, nw, sw), aggiusta left
      if (state.handle === 'w' || state.handle === 'nw' || state.handle === 'sw') {
        newLeft = state.startLeft + state.startWidth - minWidth;
      }
    }

    if (newHeight < minHeight) {
      newHeight = minHeight;
      // Se ridimensiona dall'alto (n, nw, ne), aggiusta top
      if (state.handle === 'n' || state.handle === 'nw' || state.handle === 'ne') {
        newTop = state.startTop + state.startHeight - minHeight;
      }
    }

    // Limita ai bordi del canvas
    newLeft = Math.max(0, newLeft);
    newTop = Math.max(0, newTop);

    // Aggiorna con change detection per movimento fluido
    this.updateCanvasItem(state.itemId, {
      left: newLeft,
      top: newTop,
      width: newWidth,
      height: newHeight
    }, true);
  };

  /**
   * Finalizza il resize
   */
  private finalizeResize = (): void => {
    if (this.resizeState().isResizing) {
      const resizedId = this.resizeState().itemId;
      
      this.resizeState.set({
        isResizing: false,
        itemId: null,
        handle: null,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        startWidth: 0,
        startHeight: 0
      });

      // Forza il change detection alla fine del resize
      if (resizedId) {
        this.deviceLayouts.set(new Map(this.deviceLayouts()));
      }

      // Rimuovi listener globali
      document.removeEventListener('mousemove', this.handleResizeMove);
      document.removeEventListener('mouseup', this.finalizeResize);
    }
  };

  // ================== Custom Elements ==================

  /**
   * Aggiunge un elemento di testo custom a TUTTI i dispositivi
   */
  addCustomText(left: number, top: number, width: number, height: number): string {
    this.customElementCounter++;
    const newId = `custom-text-${this.customElementCounter}`;
    
    const newItem: CanvasItem = {
      id: newId,
      type: 'custom-text',
      left,
      top,
      width,
      height,
      content: '', // Vuoto di default
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        fontFamily: 'inherit'
      }
    };

    // Aggiungi l'elemento a TUTTI i dispositivi
    this.addCanvasItemToAllDevices(newItem);
    return newId;
  }

  /**
   * Aggiunge un elemento immagine custom a TUTTI i dispositivi
   */
  addCustomImage(left: number, top: number, width: number, height: number): string {
    this.customElementCounter++;
    const newId = `custom-image-${this.customElementCounter}`;
    
    const newItem: CanvasItem = {
      id: newId,
      type: 'custom-image',
      left,
      top,
      width,
      height,
      content: '' // URL vuoto di default
    };

    // Aggiungi l'elemento a TUTTI i dispositivi
    this.addCanvasItemToAllDevices(newItem);
    return newId;
  }

  /**
   * Aggiunge un elemento a TUTTI i dispositivi
   */
  private addCanvasItemToAllDevices(item: CanvasItem): void {
    const layouts = new Map(this.deviceLayouts());
    
    for (const device of this.devicePresets) {
      const currentLayout = new Map(layouts.get(device.id) || new Map());
      
      // Verifica che non esista già
      if (!currentLayout.has(item.id)) {
        currentLayout.set(item.id, { ...item }); // Copia l'item per ogni dispositivo
        layouts.set(device.id, currentLayout);
      }
    }
    
    this.deviceLayouts.set(layouts);
  }

  /**
   * Aggiorna il contenuto di un elemento custom
   * Se isDeviceSpecific, l'elemento esiste solo sul dispositivo corrente
   * Altrimenti, aggiorna su TUTTI i dispositivi dove l'elemento esiste
   */
  updateCustomElementContent(itemId: string, content: string, isDeviceSpecific: boolean = false): void {
    const layouts = new Map(this.deviceLayouts());
    
    // Aggiorna il contenuto su tutti i dispositivi dove l'elemento esiste
    // (se device-specific, esiste solo su un dispositivo)
    for (const device of this.devicePresets) {
      const currentLayout = new Map(layouts.get(device.id) || new Map());
      const existingItem = currentLayout.get(itemId);
      
      if (existingItem) {
        const updatedItem = { 
          ...existingItem, 
          content
        };
        currentLayout.set(itemId, updatedItem);
        layouts.set(device.id, currentLayout);
      }
    }
    
    this.deviceLayouts.set(layouts);
  }
  
  /**
   * Toggle modalità device-specific per un elemento custom text
   * Se attivato: elemento visibile SOLO sul dispositivo corrente
   * Se disattivato: elemento visibile su TUTTI i dispositivi
   */
  toggleDeviceSpecificContent(itemId: string): boolean {
    const layouts = new Map(this.deviceLayouts());
    const deviceId = this.selectedDevice().id;
    const currentLayout = new Map(layouts.get(deviceId) || new Map());
    const existingItem = currentLayout.get(itemId);
    
    if (!existingItem) return false;
    
    const newIsDeviceSpecific = !existingItem.isDeviceSpecific;
    
    console.log('🔄 Toggle device-specific per', itemId, ':', {
      from: existingItem.isDeviceSpecific || false,
      to: newIsDeviceSpecific,
      currentDevice: deviceId,
      action: newIsDeviceSpecific ? 'RIMUOVI da altri dispositivi' : 'AGGIUNGI a tutti i dispositivi'
    });
    
    if (newIsDeviceSpecific) {
      // Attiva device-specific: RIMUOVI l'elemento da tutti i dispositivi TRANNE quello corrente
      for (const device of this.devicePresets) {
        const layout = new Map(layouts.get(device.id) || new Map());
        
        if (device.id === deviceId) {
          // Dispositivo corrente: segna come device-specific
          const item = layout.get(itemId);
          if (item) {
            const updatedItem = { 
              ...item, 
              isDeviceSpecific: true
            };
            layout.set(itemId, updatedItem);
            layouts.set(device.id, layout);
          }
        } else {
          // Altri dispositivi: RIMUOVI l'elemento
          layout.delete(itemId);
          layouts.set(device.id, layout);
        }
      }
      
      console.log('✅ Elemento visibile SOLO su', deviceId);
    } else {
      // Disattiva device-specific: RIAGGIUNGE l'elemento a tutti i dispositivi
      for (const device of this.devicePresets) {
        const layout = new Map(layouts.get(device.id) || new Map());
        
        if (device.id === deviceId) {
          // Dispositivo corrente: rimuovi flag device-specific
          const item = layout.get(itemId);
          if (item) {
            const updatedItem = { 
              ...item, 
              isDeviceSpecific: false
            };
            // Rimuovi contentByDevice se presente (compatibilità con vecchi dati)
            delete (updatedItem as any).contentByDevice;
            
            layout.set(itemId, updatedItem);
            layouts.set(device.id, layout);
          }
        } else {
          // Altri dispositivi: RIAGGIUNGE l'elemento con gli stessi dati del dispositivo corrente
          if (existingItem) {
            const newItem = {
              ...existingItem,
              isDeviceSpecific: false
            };
            // Rimuovi contentByDevice se presente (compatibilità con vecchi dati)
            delete (newItem as any).contentByDevice;
            
            layout.set(itemId, newItem);
            layouts.set(device.id, layout);
          }
        }
      }
      
      console.log('✅ Elemento visibile su TUTTI i dispositivi');
    }
    
    this.deviceLayouts.set(layouts);
    return newIsDeviceSpecific;
  }

  /**
   * Pulisce gli elementi custom vuoti (prima del salvataggio)
   * Rimuove da TUTTI i dispositivi
   */
  cleanEmptyCustomElements(): void {
    const layouts = new Map(this.deviceLayouts());
    let hasChanges = false;
    
    // Per ogni dispositivo
    for (const [deviceId, layout] of layouts.entries()) {
      const newLayout = new Map(layout);
      
      // Rimuovi elementi custom senza contenuto
      for (const [id, item] of newLayout.entries()) {
        if (id.startsWith('custom-') && (item.type === 'custom-text' || item.type === 'custom-image') && !item.content) {
          newLayout.delete(id);
          hasChanges = true;
        }
      }
      
      layouts.set(deviceId, newLayout);
    }
    
    // Forza il change detection solo se ci sono stati cambiamenti
    if (hasChanges) {
      this.deviceLayouts.set(layouts);
    }
  }

  // ================== Drag-to-Draw ==================

  /**
   * Inizia la creazione di un elemento con drag-to-draw
   */
  startElementCreation(type: 'text' | 'image' | 'video'): void {
    this.isCreatingElement.set(type);
  }

  /**
   * Cancella la creazione di un elemento
   */
  cancelElementCreation(): void {
    this.isCreatingElement.set(null);
    this.drawStartPos.set(null);
    this.drawCurrentPos.set(null);
  }

  /**
   * Aggiorna la posizione del cursore durante la creazione
   */
  updateCursorPosition(x: number, y: number): void {
    this.cursorPos.set({ x, y });
  }

  /**
   * Inizia il disegno del rettangolo
   */
  startDrawing(x: number, y: number): void {
    if (!this.isCreatingElement()) return;
    this.drawStartPos.set({ x, y });
    this.drawCurrentPos.set({ x, y });
  }

  /**
   * Aggiorna il disegno del rettangolo
   */
  updateDrawing(x: number, y: number): void {
    if (!this.drawStartPos()) return;
    this.drawCurrentPos.set({ x, y });
  }

  /**
   * Finalizza il disegno e crea l'elemento
   */
  finalizeDrawing(): string | null {
    const type = this.isCreatingElement();
    const startPos = this.drawStartPos();
    const currentPos = this.drawCurrentPos();

    if (!type || !startPos || !currentPos) {
      this.cancelElementCreation();
      return null;
    }

    // Calcola dimensioni e posizione
    const left = Math.min(startPos.x, currentPos.x);
    const top = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // Dimensioni minime
    if (width < 50 || height < 30) {
      this.cancelElementCreation();
      return null;
    }

    // Crea l'elemento
    let newId: string;
    if (type === 'text') {
      newId = this.addCustomText(left, top, width, height);
    } else if (type === 'video') {
      // Elemento predefinito video (non custom)
      const videoItem: any = {
        id: 'video',
        type: 'video',
        left,
        top,
        width,
        height
      };
      this.addCanvasItem(videoItem);
      newId = 'video';
    } else {
      newId = this.addCustomImage(left, top, width, height);
    }

    // Reset stato
    this.cancelElementCreation();
    return newId;
  }

  // ================== Layout Persistence ==================

  /**
   * Restituisce gli elementi predefiniti da filtrare perché vuoti
   */
  private getEmptyPredefinedElements(project?: Progetto): Set<string> {
    const emptyElements = new Set<string>();
    
    if (!project) {
      return emptyElements;
    }
    
    // Escludi video se non esiste
    if (!project.video) {
      emptyElements.add('video');
    }
    
    // Escludi technologies se array vuoto o non esiste
    if (!project.technologies || project.technologies.length === 0) {
      emptyElements.add('technologies');
    }
    
    // category e description sono sempre presenti (stringa), image sempre presente (poster)
    // Quindi non li filtriamo mai
    
    return emptyElements;
  }
  
  /**
   * Carica il layout dal server
   * Supporta sia il nuovo formato (custom per dispositivo) che il vecchio (custom condivisi)
   */
  loadCanvasLayout(layoutConfigJson: string | null, project?: Progetto): void {
    if (!layoutConfigJson) {
      // Nessun layout salvato, usa il default per tutti i dispositivi (filtrato)
      const elementsToFilter = this.getEmptyPredefinedElements(project);
      const layouts = new Map<string, Map<string, CanvasItem>>();
      
      for (const device of this.devicePresets) {
        const newLayout = new Map(this.defaultLayout);
        // Rimuovi elementi vuoti
        elementsToFilter.forEach(itemId => {
          newLayout.delete(itemId);
        });
        
        layouts.set(device.id, newLayout);
      }
      this.deviceLayouts.set(layouts);
      
      return;
    }

    try {
      const parsed = JSON.parse(layoutConfigJson);
      const layouts = new Map<string, Map<string, CanvasItem>>();
      
      // Elementi predefiniti da escludere se vuoti nel progetto
      const elementsToFilter = this.getEmptyPredefinedElements(project);
      
      // COMPATIBILITÀ: Se esiste __customElements (vecchio formato), caricalo
      const sharedCustoms = new Map<string, CanvasItem>();
      if (parsed.__customElements) {
        for (const itemId in parsed.__customElements) {
          sharedCustoms.set(itemId, parsed.__customElements[itemId]);
        }
      }

      // Carica i layout salvati per dispositivo
      for (const deviceId in parsed) {
        // Salta la chiave speciale __customElements
        if (deviceId === '__customElements') continue;
        
        const deviceLayout = new Map<string, CanvasItem>();
        
        // Carica SOLO gli elementi salvati (non il default)
        for (const itemId in parsed[deviceId]) {
          // Salta elementi predefiniti vuoti (senza contenuto nel progetto)
          if (elementsToFilter.has(itemId)) {
            continue;
          }
          
          deviceLayout.set(itemId, parsed[deviceId][itemId]);
        }
        
        // COMPATIBILITÀ: Aggiungi custom elements condivisi (se esistono nel vecchio formato)
        if (sharedCustoms.size > 0) {
          sharedCustoms.forEach((item, itemId) => {
            if (!deviceLayout.has(itemId)) {
              deviceLayout.set(itemId, item);
            }
          });
        }
        
        // Se il layout è completamente vuoto per questo dispositivo, usa il default FILTRATO
        if (deviceLayout.size === 0) {
          const newLayout = new Map(this.defaultLayout);
          // Rimuovi elementi vuoti
          elementsToFilter.forEach(itemId => {
            newLayout.delete(itemId);
          });
          layouts.set(deviceId, newLayout);
        } else {
          layouts.set(deviceId, deviceLayout);
        }
      }

      // Aggiungi layout default per dispositivi mancanti
      for (const device of this.devicePresets) {
        if (!layouts.has(device.id)) {
          const newLayout = new Map(this.defaultLayout);
          
          // Rimuovi elementi vuoti dal default
          elementsToFilter.forEach(itemId => {
            newLayout.delete(itemId);
          });
          
          // COMPATIBILITÀ: Aggiungi custom condivisi anche ai nuovi dispositivi
          sharedCustoms.forEach((item, itemId) => {
            newLayout.set(itemId, item);
          });
          
          layouts.set(device.id, newLayout);
        }
      }

      this.deviceLayouts.set(layouts);
    } catch (error) {
      console.error('Errore nel parsing del layout:', error);
      // Fallback al default (filtrato)
      const elementsToFilter = this.getEmptyPredefinedElements(project);
      const layouts = new Map<string, Map<string, CanvasItem>>();
      for (const device of this.devicePresets) {
        const newLayout = new Map(this.defaultLayout);
        // Rimuovi elementi vuoti
        elementsToFilter.forEach(itemId => {
          newLayout.delete(itemId);
        });
        layouts.set(device.id, newLayout);
      }
      this.deviceLayouts.set(layouts);
    }
  }

  /**
   * Salva il layout sul server (con debounce)
   */
  saveCanvasLayout(projectId: number): void {
    // Debounce di 500ms
    clearTimeout(this.saveLayoutTimeout);
    this.saveLayoutTimeout = setTimeout(() => {
      this.saveCanvasLayoutImmediate(projectId);
    }, 500);
  }

  /**
   * Salva il layout sul server immediatamente
   * Salva TUTTI gli elementi (predefiniti E custom) per ogni dispositivo
   */
  saveCanvasLayoutImmediate(projectId: number): void {
    const layouts = this.deviceLayouts();
    const multiDeviceConfig: any = {};

    // Converti Map dispositivi in oggetto serializzabile
    // Ora include TUTTI gli elementi (predefiniti E custom) per ogni dispositivo
    for (const [deviceId, layout] of layouts.entries()) {
      const deviceConfig: any = {};
      for (const [itemId, item] of layout.entries()) {
        deviceConfig[itemId] = item;
      }
      multiDeviceConfig[deviceId] = deviceConfig;
    }

    this.http.patch(apiUrl(`projects/${projectId}/layout`), {
      layout_config: JSON.stringify(multiDeviceConfig)
    }).subscribe({
      next: () => {
        // Layout salvato
      },
      error: (err) => {
        console.error('Errore nel salvataggio del layout:', err);
      }
    });
  }

  /**
   * Valida i bounds degli elementi per adattarli alla larghezza del dispositivo
   */
  validateItemBounds(canvasWidth: number): void {
    const deviceId = this.selectedDevice().id;
    const layouts = new Map(this.deviceLayouts());
    const currentLayout = new Map(layouts.get(deviceId) || new Map());
    
    let modified = false;

    for (const [id, item] of currentLayout.entries()) {
      let newItem = { ...item };
      let itemModified = false;

      // Se l'elemento esce dal canvas, adattalo
      if (newItem.left + newItem.width > canvasWidth) {
        // Riduci la larghezza se possibile
        const maxWidth = canvasWidth - newItem.left;
        if (maxWidth >= 100) {
          newItem.width = maxWidth;
          itemModified = true;
        } else {
          // Sposta a sinistra
          newItem.left = Math.max(0, canvasWidth - newItem.width);
          if (newItem.left + newItem.width > canvasWidth) {
            newItem.width = canvasWidth - newItem.left;
          }
          itemModified = true;
        }
      }

      if (itemModified) {
        currentLayout.set(id, newItem);
        modified = true;
      }
    }

    if (modified) {
      layouts.set(deviceId, currentLayout);
      this.deviceLayouts.set(layouts);
    }
  }

  // ================== Layout Adaptation ==================

  /**
   * Valida dimensioni e posizioni minime di un singolo item
   */
  private validateSingleItemBounds(config: { left: number; top: number; width: number; height: number }): { left: number; top: number; width: number; height: number } {
    let { left, top, width, height } = config;
    
    // Assicura larghezza minima
    width = Math.max(150, width);
    
    // Assicura posizioni non negative
    left = Math.max(0, left);
    top = Math.max(0, top);

    return { left, top, width, height };
  }

  /**
   * Riposiziona gli elementi che escono dal dispositivo, spostandoli sotto l'elemento alla loro sinistra
   */
  private reflowItems(items: CanvasItem[], maxWidth: number): CanvasItem[] {
    const MARGIN = 20; // Margine minimo dai bordi
    const GAP = 20; // Spazio tra elementi
    
    // Ordina gli elementi per posizione verticale, poi orizzontale
    const sortedItems = [...items].sort((a, b) => {
      if (Math.abs(a.top - b.top) < 30) {
        // Sono sulla stessa "riga" (con tolleranza di 30px)
        return a.left - b.left;
      }
      return a.top - b.top;
    });

    const reflowedItems: CanvasItem[] = [];
    const rows: CanvasItem[][] = [];
    let currentRow: CanvasItem[] = [];
    let currentRowTop = 0;

    // Raggruppa elementi per riga (elementi con top simile)
    sortedItems.forEach((item, index) => {
      if (index === 0) {
        currentRowTop = item.top;
        currentRow.push(item);
      } else {
        // Se l'elemento è sulla stessa riga (tolleranza 30px)
        if (Math.abs(item.top - currentRowTop) < 30) {
          currentRow.push(item);
        } else {
          // Nuova riga
          rows.push([...currentRow]);
          currentRow = [item];
          currentRowTop = item.top;
        }
      }
    });
    
    // Aggiungi l'ultima riga
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    let currentTop = MARGIN;

    // Processa ogni riga
    rows.forEach((row) => {
      let currentLeft = MARGIN;
      let maxHeightInRow = 0;

      row.forEach((item) => {
        const itemWidth = item.width;
        const itemHeight = item.height;

        // Verifica se l'elemento esce dal dispositivo
        if (currentLeft + itemWidth > maxWidth - MARGIN) {
          // Se è il primo elemento della riga e non entra, riduci la larghezza
          if (currentLeft === MARGIN) {
            const newItem: CanvasItem = {
              ...item,
              left: MARGIN,
              top: currentTop,
              width: maxWidth - (MARGIN * 2)
            };
            reflowedItems.push(newItem);
            maxHeightInRow = Math.max(maxHeightInRow, itemHeight);
            currentTop += itemHeight + GAP;
            currentLeft = MARGIN; // Reset per prossimo elemento
            return;
          }
          
          // Altrimenti, sposta l'elemento alla riga successiva
          currentTop += maxHeightInRow + GAP;
          currentLeft = MARGIN;
          maxHeightInRow = 0;
        }

        // Posiziona l'elemento
        const newItem: CanvasItem = {
          ...item,
          left: currentLeft,
          top: currentTop
        };

        reflowedItems.push(newItem);
        maxHeightInRow = Math.max(maxHeightInRow, itemHeight);
        currentLeft += itemWidth + GAP;
      });

      // Vai alla riga successiva
      currentTop += maxHeightInRow + GAP;
    });

    return reflowedItems;
  }

  /**
   * Adatta il layout di un altro dispositivo al dispositivo corrente scalandolo proporzionalmente
   */
  getAdaptedLayoutForDevice(
    targetDeviceId: string, 
    layouts: Map<string, Map<string, CanvasItem>>,
    customTargetWidth?: number
  ): Map<string, CanvasItem> | null {
    const targetDevice = this.devicePresets.find(d => d.id === targetDeviceId);
    if (!targetDevice) return null;
    
    // Usa la larghezza personalizzata se fornita, altrimenti quella del dispositivo
    const targetWidth = customTargetWidth || targetDevice.width;
    const targetHeight = targetDevice.height;

    // Ordina i dispositivi per larghezza (dal più largo al più stretto)
    const devicesByWidth = [...this.devicePresets]
      .sort((a, b) => b.width - a.width);

    // Trova il primo dispositivo più largo del target che ha un layout salvato
    let sourceDevice: DevicePreset | undefined;
    let sourceLayout: Map<string, CanvasItem> | undefined;

    for (const device of devicesByWidth) {
      // Cerca solo dispositivi più larghi o uguali al target
      if (device.width >= targetWidth && device.id !== targetDeviceId) {
        const layout = layouts.get(device.id);
        if (layout && layout.size > 0) {
          sourceDevice = device;
          sourceLayout = layout;
          break;
        }
      }
    }

    // Se non troviamo un layout da cui partire, ritorna null
    if (!sourceDevice || !sourceLayout) {
      return null;
    }

    // Calcola il fattore di scala
    const scaleX = targetWidth / sourceDevice.width;
    const scaleY = targetHeight / sourceDevice.height;

    // Crea il nuovo layout scalato
    const adaptedLayout = new Map<string, CanvasItem>();

    // Prima passa: scala tutti gli elementi
    const scaledItems: CanvasItem[] = [];
    
    sourceLayout.forEach((item, itemId) => {
      // Calcola dimensioni scalate
      let scaledLeft = Math.round(item.left * scaleX);
      let scaledTop = Math.round(item.top * scaleY);
      let scaledWidth = Math.round(item.width * scaleX);
      let scaledHeight = Math.round(item.height * scaleY);

      // Valida limiti minimi
      const validated = this.validateSingleItemBounds({
        left: scaledLeft,
        top: scaledTop,
        width: scaledWidth,
        height: scaledHeight
      });

      scaledItems.push({
        id: itemId,
        left: validated.left,
        top: validated.top,
        width: validated.width,
        height: validated.height,
        type: item.type,
        content: item.content
      });
    });

    // Seconda passa: reflow per elementi che escono orizzontalmente
    const reflowedItems = this.reflowItems(scaledItems, targetWidth);

    // Terza passa: crea la mappa finale
    reflowedItems.forEach(item => {
      adaptedLayout.set(item.id, item);
    });

    return adaptedLayout;
  }

  /**
   * Determina se un elemento è parzialmente o totalmente fuori dall'area visibile del dispositivo
   */
  isItemOutsideViewport(itemId: string): boolean {
    const item = this.canvasItems().get(itemId);
    if (!item) return false;
    
    const device = this.selectedDevice();
    const viewportWidth = device.width;
    const viewportHeight = device.height;
    
    // Controlla se l'elemento è parzialmente o totalmente fuori dall'area visibile
    const itemRight = item.left + item.width;
    const itemBottom = item.top + item.height;
    
    return (
      item.left >= viewportWidth || // completamente a destra
      item.top >= viewportHeight || // completamente sotto
      itemRight <= 0 || // completamente a sinistra
      itemBottom <= 0 || // completamente sopra
      itemRight > viewportWidth || // parte destra fuori
      itemBottom > viewportHeight // parte inferiore fuori
    );
  }

  // ================== Cleanup ==================

  /**
   * Reset completo del servizio (per cleanup)
   */
  reset(): void {
    // Reset tutti i signals
    this.selectedDevice.set(this.devicePresets[3]);
    this.deviceLayouts.set(new Map());
    this.dragState.set({
      isDragging: false,
      draggedItemId: null,
      startX: 0,
      startY: 0,
      startItemX: 0,
      startItemY: 0
    });
    this.resizeState.set({
      isResizing: false,
      itemId: null,
      handle: null,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      startWidth: 0,
      startHeight: 0
    });
    this.cancelElementCreation();
    this.customElementCounter = 0;
    
    // Cleanup listeners
    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.finalizeDrag);
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.finalizeResize);
  }
}

