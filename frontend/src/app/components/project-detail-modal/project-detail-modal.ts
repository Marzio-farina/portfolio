import { Component, inject, input, output, signal, computed, effect, afterNextRender, ViewChild, ElementRef, untracked, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProjectDetailModalService } from '../../services/project-detail-modal.service';
import { ProjectService } from '../../services/project.service';
import { EditModeService } from '../../services/edit-mode.service';
import { AuthService } from '../../services/auth.service';
import { Progetto, Technology } from '../../core/models/project';
import { Notification, NotificationType } from '../notification/notification';
import { apiUrl } from '../../core/api/api-url';
import { map } from 'rxjs';

interface Category {
  id: number;
  title: string;
}

interface CanvasItem {
  id: string;
  left: number;    // posizione X in pixel
  top: number;     // posizione Y in pixel
  width: number;   // larghezza in pixel
  height: number;  // altezza in pixel
}

interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  icon?: string;
}

interface DeviceLayout {
  deviceId: string;
  items: Map<string, CanvasItem>;
}

interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  startX: number;
  startY: number;
  startItemX: number;
  startItemY: number;
}

interface ResizeState {
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

@Component({
  selector: 'app-project-detail-modal',
  standalone: true,
  imports: [ReactiveFormsModule, Notification],
  templateUrl: './project-detail-modal.html',
  styleUrls: ['./project-detail-modal.css', './project-detail-modal.responsive.css']
})
export class ProjectDetailModal implements OnDestroy {
  private projectDetailModalService = inject(ProjectDetailModalService);
  private projectService = inject(ProjectService);
  private editModeService = inject(EditModeService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  // Riceve il progetto dal servizio tramite input
  project = input.required<Progetto>();

  // Output per comunicare al componente padre
  closed = output<void>();

  // Aspect ratio per le immagini senza width/height
  aspectRatio = signal<string | null>(null);
  defaultAR = '16 / 9';
  
  // Altezza fissa del contenitore
  containerHeight = 300;
  
  // Larghezza calcolata dinamicamente basata sull'aspect ratio
  containerWidth = signal<number | null>(null);

  // Indica se l'immagine è verticale (height > width)
  isVerticalImage = signal<boolean>(false);

  // Indica se c'è stato un errore nel caricamento dell'immagine
  imageLoadError = signal<boolean>(false);
  
  // Stato caricamento video
  videoLoading = signal<boolean>(false);
  videoLoadProgress = signal<number>(0); // 0-100

  // File input per modificare immagine e video
  @ViewChild('posterInput') posterInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInputRef?: ElementRef<HTMLInputElement>;
  
  // File selezionati per upload
  selectedPosterFile = signal<File | null>(null);
  selectedVideoFile = signal<File | null>(null);
  posterPreviewUrl = signal<string | null>(null);
  videoPreviewUrl = signal<string | null>(null);
  isDragOverPoster = signal(false);
  isDragOverVideo = signal(false);
  videoRemoved = signal<boolean>(false); // Flag per indicare che il video esistente è stato rimosso

  // Form per l'editing
  editForm!: FormGroup;
  isEditing = computed(() => this.editModeService.isEditing());
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  canEdit = computed(() => this.isAuthenticated() && this.isEditing());
  saving = signal(false);
  notifications = signal<{ id: string; message: string; type: NotificationType; timestamp: number; fieldId: string; }[]>([]);
  
  // Categorie per il select
  categories = signal<Category[]>([]);
  loadingCategories = signal(false);

  // Tecnologie disponibili e selezionate
  availableTechnologies = signal<Technology[]>([]);
  loadingTechnologies = signal(false);
  selectedTechnologyIds = signal<number[]>([]);

  // Gestione canvas con absolute positioning - Attiva automaticamente quando canEdit() è true
  isEditMode = computed(() => this.canEdit());
  
  // Traccia progetti già caricati per evitare loop
  private loadedProjectIds = new Set<number>();
  private saveLayoutTimeout: any = null;

  // Presets dispositivi standard
  devicePresets: DevicePreset[] = [
    { id: 'mobile-small', name: 'Mobile S', width: 375, height: 667, icon: '📱' },
    { id: 'mobile', name: 'Mobile', width: 414, height: 896, icon: '📱' },
    { id: 'tablet', name: 'Tablet', width: 768, height: 1024, icon: '📱' },
    { id: 'desktop', name: 'Desktop', width: 1920, height: 1080, icon: '💻' },
    { id: 'desktop-wide', name: 'Wide', width: 2560, height: 1440, icon: '🖥️' }
  ];

  // Dispositivo attualmente selezionato
  selectedDevice = signal<DevicePreset>(this.devicePresets[3]); // Default: desktop
  
  // Dialog per custom size
  showCustomSizeDialog = signal(false);
  customWidth = signal(1920);
  customHeight = signal(1080);

  // Layout multipli per dispositivi diversi
  deviceLayouts = signal<Map<string, Map<string, CanvasItem>>>(new Map());

  // Verifica se il layout corrente è adattato automaticamente (non salvato)
  isLayoutAdapted = computed(() => {
    const deviceId = this.selectedDevice().id;
    const layouts = this.deviceLayouts();
    return !layouts.has(deviceId);
  });

  // Dimensioni griglia per snap
  gridCols = 4;
  gridRows = 5;
  gridCellSize = 160;
  
  // Layout predefinito per il dispositivo corrente
  private defaultLayout = new Map<string, CanvasItem>([
    ['image', { id: 'image', left: 20, top: 20, width: 400, height: 320 }],
    ['video', { id: 'video', left: 440, top: 20, width: 400, height: 320 }],
    ['category', { id: 'category', left: 20, top: 360, width: 200, height: 120 }],
    ['technologies', { id: 'technologies', left: 240, top: 360, width: 200, height: 120 }],
    ['description', { id: 'description', left: 460, top: 360, width: 380, height: 240 }]
  ]);

  // Layout attuale basato sul dispositivo selezionato
  canvasItems = computed(() => {
    const deviceId = this.selectedDevice().id;
    const layouts = this.deviceLayouts();
    
    const deviceLayout = layouts.get(deviceId);
    
    // Se esiste un layout per questo dispositivo, usalo
    if (deviceLayout) {
      return deviceLayout;
    }
    
    // Altrimenti, cerca un layout di un dispositivo più largo e scalalo
    // In modalità visualizzazione, usa la larghezza reale dello schermo
    const targetWidth = !this.isEditMode() ? window.innerWidth : this.selectedDevice().width;
    const adaptedLayout = this.getAdaptedLayoutForDevice(deviceId, layouts, targetWidth);
    if (adaptedLayout) {
      return adaptedLayout;
    }
    
    // Fallback al layout default
    return this.defaultLayout;
  });

  // Calcola altezza dinamica del canvas in base agli elementi
  canvasHeight = computed(() => {
    const items = this.canvasItems();
    let maxBottom = 800; // Minimo 800px
    
    items.forEach(item => {
      const bottom = item.top + item.height + 40;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });
    
    return maxBottom;
  });

  // Calcola altezza dinamica del viewport (si espande se necessario)
  viewportHeight = computed(() => {
    const deviceHeight = this.selectedDevice().height;
    const contentHeight = this.canvasHeight();
    
    // Usa il maggiore tra l'altezza del dispositivo e quella necessaria per il contenuto
    return Math.max(deviceHeight, contentHeight);
  });

  /**
   * Adatta il layout di un altro dispositivo al dispositivo corrente scalandolo proporzionalmente
   */
  private getAdaptedLayoutForDevice(
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
      const validated = this.validateItemBounds({
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
        height: validated.height
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
   * Determina se un elemento è parzialmente o totalmente fuori dall'area visibile del dispositivo
   */
  isItemOutsideViewport(itemId: string): boolean {
    if (!this.isEditMode()) return false;
    
    const items = this.canvasItems();
    const item = items.get(itemId);
    if (!item) return false;
    
    const device = this.selectedDevice();
    const viewportWidth = device.width;
    const viewportHeight = device.height;
    
    // Considera il padding del canvas (20px)
    const padding = 20;
    
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

  dragState = signal<DragState>({
    isDragging: false,
    draggedItemId: null,
    startX: 0,
    startY: 0,
    startItemX: 0,
    startItemY: 0
  });

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

  constructor() {
    // Inizializza il form
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(50)]],
      category_id: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.maxLength(1000)]]
    });

    // Carica il layout personalizzato quando il progetto cambia (solo ID progetto come dipendenza)
    effect(() => {
      const projectId = this.project().id;
      const layoutConfig = this.project().layout_config;
      
      // Carica solo se non è già stato caricato per questo progetto
      if (layoutConfig && !this.loadedProjectIds.has(projectId)) {
        untracked(() => {
          this.loadCanvasLayout(layoutConfig);
          this.loadedProjectIds.add(projectId);
        });
      }
    });

    // Seleziona automaticamente il dispositivo giusto in base alla larghezza dello schermo (solo in non-edit mode)
    effect(() => {
      const isEdit = this.isEditMode();
      
      if (!isEdit) {
        untracked(() => {
          this.selectDeviceByScreenWidth();
        });
      }
    });

    // Carica le categorie e le tecnologie
    this.loadCategories();
    this.loadTechnologies();

    // Aggiorna il form quando cambia il progetto
    effect(() => {
      const proj = this.project();
      if (proj && this.editForm) {
        // Popola immediatamente il form
        this.updateFormValues(proj);
        // Reset errore immagine quando cambia il progetto
        this.imageLoadError.set(false);
      }
    });

    // Assicura che il form sia aggiornato anche dopo il primo render
    afterNextRender(() => {
      const proj = this.project();
      if (proj && this.editForm) {
        this.updateFormValues(proj);
      }
    });
  }

  /**
   * Carica le categorie dal backend
   */
  private loadCategories(): void {
    this.loadingCategories.set(true);
    this.http.get<Category[]>(apiUrl('categories')).pipe(
      map(cats => cats || [])
    ).subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loadingCategories.set(false);
      },
      error: () => {
        // Fallback a categorie di default se l'endpoint non è disponibile
        this.categories.set([
          { id: 1, title: 'Web' },
          { id: 2, title: 'Mobile' },
          { id: 3, title: 'Design' }
        ]);
        this.loadingCategories.set(false);
      }
    });
  }

  /**
   * Carica le tecnologie dal backend
   */
  private loadTechnologies(): void {
    this.loadingTechnologies.set(true);
    this.http.get<Technology[]>(apiUrl('technologies')).pipe(
      map(techs => techs || [])
    ).subscribe({
      next: (techs) => {
        this.availableTechnologies.set(techs);
        this.loadingTechnologies.set(false);
      },
      error: () => {
        this.availableTechnologies.set([]);
        this.loadingTechnologies.set(false);
      }
    });
  }

  /**
   * Aggiorna i valori del form con i dati del progetto
   */
  private updateFormValues(proj: Progetto): void {
    if (!this.editForm) return;
    
    // Trova la categoria corrispondente al nome
    const category = this.categories().find(c => c.title === proj.category);
    const categoryId = category?.id || null;
    
    // Estrai gli ID delle tecnologie attualmente associate al progetto
    const technologyIds = proj.technologies?.map(t => t.id) || [];
    this.selectedTechnologyIds.set(technologyIds);
    
    // Usa setTimeout per assicurarsi che il form sia completamente inizializzato nel DOM
    setTimeout(() => {
      if (this.editForm) {
        this.editForm.patchValue({
          title: proj.title || '',
          category_id: categoryId || '',
          description: proj.description || ''
        }, { emitEvent: false });
      }
    }, 0);
  }

  /**
   * Verifica se una tecnologia è selezionata
   */
  isTechnologySelected(techId: number): boolean {
    return this.selectedTechnologyIds().includes(techId);
  }

  /**
   * Aggiunge o rimuove una tecnologia dalla selezione
   */
  toggleTechnology(techId: number): void {
    const currentIds = this.selectedTechnologyIds();
    const index = currentIds.indexOf(techId);
    
    if (index >= 0) {
      // Rimuovi la tecnologia
      this.selectedTechnologyIds.set(currentIds.filter(id => id !== techId));
    } else {
      // Aggiungi la tecnologia
      this.selectedTechnologyIds.set([...currentIds, techId]);
    }
  }

  /**
   * Chiude la modal
   */
  onClose(): void {
    this.projectDetailModalService.close();
    this.closed.emit();
  }

  /**
   * Gestisce il caricamento dell'immagine per calcolare l'aspect ratio e la larghezza del contenitore
   */
  onImgLoad(ev: Event): void {
    const el = ev.target as HTMLImageElement;
    if (el?.naturalWidth && el?.naturalHeight) {
      const width = el.naturalWidth;
      const height = el.naturalHeight;
      
      // Calcola aspect ratio
      this.aspectRatio.set(`${width} / ${height}`);
      
      // Determina se l'immagine è verticale (height > width)
      this.isVerticalImage.set(height > width);
      
      // Calcola la larghezza del contenitore basata sull'altezza fissa e l'aspect ratio
      const calculatedWidth = this.containerHeight * (width / height);
      this.containerWidth.set(calculatedWidth);
      
      // Reset errore se l'immagine si carica correttamente
      this.imageLoadError.set(false);
    }
  }

  /**
   * Gestisce l'errore di caricamento dell'immagine
   */
  onImgError(ev: Event): void {
    this.imageLoadError.set(true);
    console.warn('Errore caricamento immagine progetto:', this.project().poster);
  }

  /**
   * Gestisce il click sul video
   */
  onVideoClick(event: Event): void {
    event.stopPropagation();
    const video = event.target as HTMLVideoElement;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }
  
  /**
   * Gestisce l'inizio del caricamento del video
   */
  onVideoLoadStart(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.videoLoading.set(true);
    this.videoLoadProgress.set(0);
  }
  
  /**
   * Gestisce il progresso del caricamento del video
   */
  onVideoProgress(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video.buffered.length > 0 && video.duration > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const progress = (bufferedEnd / video.duration) * 100;
      this.videoLoadProgress.set(Math.min(100, Math.round(progress)));
    }
  }
  
  /**
   * Gestisce il completamento del caricamento del video
   */
  onVideoLoadedData(event: Event): void {
    this.videoLoading.set(false);
    this.videoLoadProgress.set(100);
  }
  
  /**
   * Gestisce l'errore nel caricamento del video
   */
  onVideoError(event: Event): void {
    this.videoLoading.set(false);
    this.videoLoadProgress.set(0);
    console.warn('Errore caricamento video:', this.project().video);
  }

  /**
   * Salva le modifiche al progetto
   */
  onSave(): void {
    if (this.saving() || this.editForm.invalid) return;

    this.saving.set(true);
    this.notifications.set([]);

    const formValue = this.editForm.getRawValue();
    const updateData: any = {};

    // Invia solo i campi modificati
    if (formValue.title && formValue.title !== this.project().title) {
      updateData.title = formValue.title.trim();
    }
    if (formValue.category_id && formValue.category_id !== this.getCurrentCategoryId()) {
      updateData.category_id = formValue.category_id;
    }
    if (formValue.description !== (this.project().description || '')) {
      updateData.description = formValue.description?.trim() || '';
    }

    // Gestisci le tecnologie: confronta con quelle attuali del progetto
    const currentTechIds = this.project().technologies?.map(t => t.id) || [];
    const newTechIds = this.selectedTechnologyIds();
    const techIdsChanged = currentTechIds.length !== newTechIds.length ||
      !currentTechIds.every(id => newTechIds.includes(id)) ||
      !newTechIds.every(id => currentTechIds.includes(id));
    
    if (techIdsChanged) {
      updateData.technology_ids = newTechIds;
    }

    // Gestisci upload file se presenti
    // Se il video è stato rimosso (campo speciale per indicare rimozione), devi gestirlo
    const hasPosterFile = this.selectedPosterFile();
    const hasVideoFile = this.selectedVideoFile();
    const videoRemoved = this.videoRemoved();
    
    // Se ci sono file da caricare O un video da rimuovere, usa FormData
    if (hasPosterFile || hasVideoFile || videoRemoved) {
      // Se ci sono file, usa FormData
      const formData = new FormData();
      
      // Aggiungi i dati esistenti
      Object.keys(updateData).forEach(key => {
        if (key === 'technology_ids') {
          // Le tecnologie devono essere inviate come array
          updateData.technology_ids.forEach((id: number, index: number) => {
            formData.append(`technology_ids[${index}]`, String(id));
          });
        } else {
          formData.append(key, updateData[key]);
        }
      });
      
      // Aggiungi i file se presenti
      if (hasPosterFile) {
        formData.append('poster_file', hasPosterFile);
      }
      if (hasVideoFile) {
        formData.append('video_file', hasVideoFile);
      }
      
      // Se il video è stato rimosso, invia un flag speciale
      if (videoRemoved && !hasVideoFile) {
        formData.append('remove_video', 'true');
      }
      
      this.projectService.updateWithFiles$(this.project().id, formData).subscribe({
        next: (updatedProject: Progetto) => {
          this.saving.set(false);
          this.addNotification('success', 'Progetto aggiornato con successo!');
          
          // Aggiorna i preview
          if (updatedProject.poster) {
            this.posterPreviewUrl.set(null);
          }
          if (updatedProject.video) {
            this.videoPreviewUrl.set(null);
          }
          
          // Pulisci i file selezionati
          this.selectedPosterFile.set(null);
          this.selectedVideoFile.set(null);
          this.videoRemoved.set(false);
          if (this.posterInputRef?.nativeElement) this.posterInputRef.nativeElement.value = '';
          if (this.videoInputRef?.nativeElement) this.videoInputRef.nativeElement.value = '';
          
          this.projectDetailModalService.selectedProject.set(updatedProject);
          this.projectDetailModalService.markAsModified(updatedProject);
        },
        error: (err: any) => {
          this.saving.set(false);
          const message = err?.error?.message || err?.error?.errors?.message?.[0] || 'Errore durante il salvataggio';
          this.addNotification('error', message);
        }
      });
      return;
    }

    // Se non ci sono file, usa il metodo normale
    this.projectService.update$(this.project().id, updateData).subscribe({
      next: (updatedProject) => {
        this.saving.set(false);
        this.addNotification('success', 'Progetto aggiornato con successo!');
        
        // IMPORTANTE: Aggiorna prima selectedProject per aggiornare il dialog
        // POI marca come modificato per aggiornare la lista (questo evita conflitti)
        this.projectDetailModalService.selectedProject.set(updatedProject);
        
        // Poi marca come modificato per triggerare l'aggiornamento della lista
        this.projectDetailModalService.markAsModified(updatedProject);
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message || err?.error?.errors?.message?.[0] || 'Errore durante il salvataggio';
        this.addNotification('error', message);
      }
    });
  }

  /**
   * Restituisce l'ID della categoria corrente del progetto
   */
  private getCurrentCategoryId(): number | null {
    const category = this.categories().find(c => c.title === this.project().category);
    return category?.id || null;
  }

  /**
   * Annulla le modifiche
   */
  onCancel(): void {
    // Ripristina i valori originali
    const proj = this.project();
    this.updateFormValues(proj);
    this.notifications.set([]);
    
    // Ripristina anche i file selezionati
    this.selectedPosterFile.set(null);
    this.selectedVideoFile.set(null);
    this.posterPreviewUrl.set(null);
    this.videoPreviewUrl.set(null);
    this.videoRemoved.set(false);
    if (this.posterInputRef?.nativeElement) this.posterInputRef.nativeElement.value = '';
    if (this.videoInputRef?.nativeElement) this.videoInputRef.nativeElement.value = '';
  }
  
  // ================== Gestione upload file ==================
  
  openPosterPicker(): void {
    this.posterInputRef?.nativeElement?.click();
  }
  
  openVideoPicker(): void {
    this.videoInputRef?.nativeElement?.click();
  }
  
  onPosterFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.handleSelectedPosterFile(file);
  }
  
  onVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.handleSelectedVideoFile(file);
  }
  
  private handleSelectedPosterFile(file: File): void {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.addNotification('error', 'Formato file non supportato. Usa JPEG, PNG, GIF o WEBP.');
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.addNotification('error', 'Il file è troppo grande. Dimensione massima: 5MB.');
      return;
    }
    
    this.selectedPosterFile.set(file);
    
    // Crea preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      this.posterPreviewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }
  
  private handleSelectedVideoFile(file: File): void {
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validTypes.includes(file.type)) {
      this.addNotification('error', 'Formato video non supportato. Usa MP4, WEBM o OGG.');
      return;
    }
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.addNotification('error', 'Il video è troppo grande. Dimensione massima: 50MB.');
      return;
    }
    
    this.selectedVideoFile.set(file);
    this.videoRemoved.set(false); // Resetta il flag se si seleziona un nuovo video
    
    // Crea preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      this.videoPreviewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }
  
  onDragOverPoster(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverPoster.set(true);
  }
  
  onDragLeavePoster(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverPoster.set(false);
  }
  
  onFileDropPoster(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverPoster.set(false);
    const dt = event.dataTransfer;
    const file = dt?.files?.[0];
    if (!file) return;
    this.handleSelectedPosterFile(file);
  }
  
  onDragOverVideo(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverVideo.set(true);
  }
  
  onDragLeaveVideo(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverVideo.set(false);
  }
  
  onFileDropVideo(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverVideo.set(false);
    const dt = event.dataTransfer;
    const file = dt?.files?.[0];
    if (!file) return;
    this.handleSelectedVideoFile(file);
  }
  
  removeVideo(): void {
    this.selectedVideoFile.set(null);
    this.videoPreviewUrl.set(null);
    this.videoRemoved.set(true); // Indica che il video esistente deve essere rimosso
    if (this.videoInputRef?.nativeElement) this.videoInputRef.nativeElement.value = '';
    this.addNotification('info', 'Video rimosso. Ricorda di salvare per applicare le modifiche.');
  }
  
  getPosterUrl(): string | null {
    return this.posterPreviewUrl() || this.project().poster || null;
  }
  
  getVideoUrl(): string | null {
    return this.videoPreviewUrl() || this.project().video || null;
  }


  /**
   * Gestisce le notifiche
   */
  private addNotification(type: NotificationType, message: string): void {
    this.notifications.update(list => [
      ...list.filter(n => n.fieldId !== 'global'),
      {
        id: `global-${Date.now()}`,
        message,
        type,
        timestamp: Date.now(),
        fieldId: 'global'
      }
    ]);
  }

  getMostSevereNotification() {
    const list = this.notifications();
    if (!list.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }

  // ================== Metodi per Gestione Dispositivi ==================

  /**
   * Seleziona un dispositivo preset
   */
  selectDevice(device: DevicePreset): void {
    this.selectedDevice.set(device);
  }

  /**
   * Seleziona automaticamente il dispositivo in base alla larghezza dello schermo
   * Cerca il dispositivo con layout salvato più vicino alla larghezza corrente
   */
  private selectDeviceByScreenWidth(): void {
    const screenWidth = window.innerWidth;
    const layouts = this.deviceLayouts();
    
    // Se ci sono layout salvati, trova quello più adatto
    if (layouts.size > 0) {
      let closestDevice: DevicePreset | undefined = undefined;
      let smallestDifference = Infinity;
      
      // Cerca il dispositivo con layout salvato più vicino alla larghezza attuale
      this.devicePresets.forEach((preset: DevicePreset) => {
        if (layouts.has(preset.id)) {
          const difference = Math.abs(preset.width - screenWidth);
          if (difference < smallestDifference) {
            smallestDifference = difference;
            closestDevice = preset;
          }
        }
      });
      
      if (closestDevice !== undefined) {
        this.selectedDevice.set(closestDevice);
        return;
      }
    }
    
    // Fallback: selezione basata su range standard
    let selectedPreset: DevicePreset;
    
    if (screenWidth <= 414) {
      selectedPreset = this.devicePresets.find(d => d.id === 'mobile') || this.devicePresets[1];
    } else if (screenWidth <= 768) {
      selectedPreset = this.devicePresets.find(d => d.id === 'tablet') || this.devicePresets[2];
    } else if (screenWidth <= 1920) {
      selectedPreset = this.devicePresets.find(d => d.id === 'desktop') || this.devicePresets[3];
    } else {
      selectedPreset = this.devicePresets.find(d => d.id === 'desktop-wide') || this.devicePresets[4];
    }
    
    this.selectedDevice.set(selectedPreset);
  }

  /**
   * Apre dialog per custom size
   */
  openCustomSizeDialog(): void {
    this.showCustomSizeDialog.set(true);
  }

  /**
   * Applica dimensioni custom
   */
  applyCustomSize(): void {
    const customDevice: DevicePreset = {
      id: 'custom',
      name: `Custom ${this.customWidth()}×${this.customHeight()}`,
      width: this.customWidth(),
      height: this.customHeight(),
      icon: '⚙️'
    };
    
    this.selectedDevice.set(customDevice);
    this.showCustomSizeDialog.set(false);
  }

  /**
   * Aggiorna il layout per il dispositivo corrente
   */
  private updateCurrentDeviceLayout(items: Map<string, CanvasItem>): void {
    const deviceId = this.selectedDevice().id;
    const layouts = new Map(this.deviceLayouts());
    layouts.set(deviceId, new Map(items));
    this.deviceLayouts.set(layouts);
  }

  /**
   * Salva il layout adattato corrente come configurazione per questo dispositivo
   */
  saveAdaptedLayoutForCurrentDevice(): void {
    if (!this.isEditMode()) return;
    
    const currentItems = this.canvasItems();
    this.updateCurrentDeviceLayout(currentItems);
    
    // Salva immediatamente
    this.saveCanvasLayout();
  }

  // ================== Metodi per Canvas con Absolute Positioning ==================

  /**
   * Ottiene lo stile inline per un elemento del canvas
   */
  getItemStyle(itemId: string): { left: number; top: number; width: number; height: number } {
    const item = this.canvasItems().get(itemId);
    return item || { left: 0, top: 0, width: 200, height: 150 };
  }

  /**
   * Gestisce il mousedown su un elemento per iniziare il drag
   */
  onItemMouseDown(event: MouseEvent, itemId: string): void {
    if (!this.isEditMode()) return;
    
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

    // Aggiungi event listeners globali
    document.addEventListener('mousemove', this.handleDragMoveGlobal);
    document.addEventListener('mouseup', this.handleMouseUpGlobal);
  }

  /**
   * Handler globale per mousemove (bound function)
   */
  private handleDragMoveGlobal = (event: MouseEvent): void => {
    if (this.dragState().isDragging) {
      this.handleDragMove(event);
    } else if (this.resizeState().isResizing) {
      this.handleResizeMove(event);
    }
  };

  /**
   * Handler globale per mouseup (bound function)
   */
  private handleMouseUpGlobal = (event: MouseEvent): void => {
    if (this.dragState().isDragging) {
      this.finalizeDrag();
    } else if (this.resizeState().isResizing) {
      this.finalizeResize();
    }
    
    // Rimuovi event listeners
    document.removeEventListener('mousemove', this.handleDragMoveGlobal);
    document.removeEventListener('mouseup', this.handleMouseUpGlobal);
  };

  /**
   * Movimento durante il drag
   */
  private handleDragMove(event: MouseEvent): void {
    const state = this.dragState();
    if (!state.draggedItemId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    const newLeft = state.startItemX + deltaX;
    const newTop = state.startItemY + deltaY;

    // Aggiorna posizione in tempo reale
    const items = new Map(this.canvasItems());
    const item = items.get(state.draggedItemId);
    if (!item) return;

    // Limita solo a valori positivi, il canvas si espanderà automaticamente
    items.set(state.draggedItemId, {
      ...item,
      left: Math.max(0, newLeft),
      top: Math.max(0, newTop)
    });

    // Aggiorna layout del dispositivo corrente
    this.updateCurrentDeviceLayout(items);
  }

  /**
   * Finalizza il drag con snap-to-grid
   */
  private finalizeDrag(): void {
    const state = this.dragState();
    if (!state.draggedItemId) return;

    const item = this.canvasItems().get(state.draggedItemId);
    if (!item) return;

    // Snap alla griglia più vicina (solo valori positivi)
    const snappedLeft = Math.max(0, this.snapToGrid(item.left));
    const snappedTop = Math.max(0, this.snapToGrid(item.top));

    const items = new Map(this.canvasItems());
    items.set(state.draggedItemId, {
      ...item,
      left: snappedLeft,
      top: snappedTop
    });

    // Aggiorna layout del dispositivo corrente
    this.updateCurrentDeviceLayout(items);

    // Reset stato drag
    this.dragState.set({
      isDragging: false,
      draggedItemId: null,
      startX: 0,
      startY: 0,
      startItemX: 0,
      startItemY: 0
    });

    // Salva layout
    this.saveCanvasLayout();
  }

  /**
   * Snap a multipli di 20px (griglia fine)
   */
  private snapToGrid(value: number): number {
    const snapSize = 20;
    return Math.round(value / snapSize) * snapSize;
  }

  // ================== Metodi per Resize con Absolute Positioning ==================

  /**
   * Gestisce il mousedown su un resize handle
   */
  onResizeHandleMouseDown(event: MouseEvent, itemId: string, handle: string): void {
    if (!this.isEditMode()) return;
    
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

    // Aggiungi event listeners globali
    document.addEventListener('mousemove', this.handleDragMoveGlobal);
    document.addEventListener('mouseup', this.handleMouseUpGlobal);
  }

  /**
   * Gestisce il movimento durante il resize
   */
  private handleResizeMove(event: MouseEvent): void {
    const state = this.resizeState();
    if (!state.itemId) return;

    const item = this.canvasItems().get(state.itemId);
    if (!item) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    let newLeft = state.startLeft;
    let newTop = state.startTop;
    let newWidth = state.startWidth;
    let newHeight = state.startHeight;

    const minWidth = 150;  // Larghezza minima
    const minHeight = 100; // Altezza minima

    // Calcola nuove dimensioni in base all'handle
    switch (state.handle) {
      case 'e': // East (destra)
        newWidth = Math.max(minWidth, state.startWidth + deltaX);
        break;
      case 'w': // West (sinistra)
        newWidth = Math.max(minWidth, state.startWidth - deltaX);
        newLeft = state.startLeft + (state.startWidth - newWidth);
        break;
      case 's': // South (sotto)
        newHeight = Math.max(minHeight, state.startHeight + deltaY);
        break;
      case 'n': // North (sopra)
        newHeight = Math.max(minHeight, state.startHeight - deltaY);
        newTop = state.startTop + (state.startHeight - newHeight);
        break;
      case 'se': // South-East
        newWidth = Math.max(minWidth, state.startWidth + deltaX);
        newHeight = Math.max(minHeight, state.startHeight + deltaY);
        break;
      case 'sw': // South-West
        newWidth = Math.max(minWidth, state.startWidth - deltaX);
        newLeft = state.startLeft + (state.startWidth - newWidth);
        newHeight = Math.max(minHeight, state.startHeight + deltaY);
        break;
      case 'ne': // North-East
        newWidth = Math.max(minWidth, state.startWidth + deltaX);
        newHeight = Math.max(minHeight, state.startHeight - deltaY);
        newTop = state.startTop + (state.startHeight - newHeight);
        break;
      case 'nw': // North-West
        newWidth = Math.max(minWidth, state.startWidth - deltaX);
        newLeft = state.startLeft + (state.startWidth - newWidth);
        newHeight = Math.max(minHeight, state.startHeight - deltaY);
        newTop = state.startTop + (state.startHeight - newHeight);
        break;
    }

    // Aggiorna in tempo reale (il canvas si espanderà automaticamente)
    const items = new Map(this.canvasItems());
    items.set(state.itemId, {
      ...item,
      left: Math.max(0, newLeft),
      top: Math.max(0, newTop),
      width: newWidth,
      height: newHeight
    });

    // Aggiorna layout del dispositivo corrente
    this.updateCurrentDeviceLayout(items);
  }

  /**
   * Finalizza il resize con snap
   */
  private finalizeResize(): void {
    const state = this.resizeState();
    if (!state.itemId) return;

    const item = this.canvasItems().get(state.itemId);
    if (!item) return;

    // Snap posizioni e dimensioni (solo valori positivi e minimi)
    const snappedLeft = Math.max(0, this.snapToGrid(item.left));
    const snappedTop = Math.max(0, this.snapToGrid(item.top));
    const snappedWidth = Math.max(150, this.snapToGrid(item.width));
    const snappedHeight = Math.max(100, this.snapToGrid(item.height));

    const items = new Map(this.canvasItems());
    items.set(state.itemId, {
      ...item,
      left: snappedLeft,
      top: snappedTop,
      width: snappedWidth,
      height: snappedHeight
    });

    // Aggiorna layout del dispositivo corrente
    this.updateCurrentDeviceLayout(items);

    // Reset stato
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

    // Salva layout
    this.saveCanvasLayout();
  }

  // ================== Metodi per Persistenza Layout ==================

  /**
   * Carica il layout dal progetto (supporta layout multipli per dispositivo)
   */
  private loadCanvasLayout(layoutConfig: Record<string, any> | null): void {
    if (!layoutConfig) {
      return;
    }

    const layouts = new Map<string, Map<string, CanvasItem>>();

    // Se layoutConfig contiene chiavi di dispositivi (multi-device)
    if (layoutConfig['desktop'] || layoutConfig['mobile'] || layoutConfig['tablet']) {
      // Layout multi-dispositivo
      Object.entries(layoutConfig).forEach(([deviceId, deviceConfig]) => {
        const itemsMap = new Map<string, CanvasItem>();
        
        Object.entries(deviceConfig as Record<string, any>).forEach(([itemId, config]) => {
          const validatedConfig = this.validateItemBounds(config);
          itemsMap.set(itemId, {
            id: itemId,
            left: validatedConfig.left,
            top: validatedConfig.top,
            width: validatedConfig.width,
            height: validatedConfig.height
          });
        });
        
        layouts.set(deviceId, itemsMap);
      });
    } else {
      // Layout legacy (singolo, usa default per desktop)
      const itemsMap = new Map<string, CanvasItem>();
      
      Object.entries(layoutConfig).forEach(([key, config]) => {
        const validatedConfig = this.validateItemBounds(config as any);
        itemsMap.set(key, {
          id: key,
          left: validatedConfig.left,
          top: validatedConfig.top,
          width: validatedConfig.width,
          height: validatedConfig.height
        });
      });
      
      layouts.set('desktop', itemsMap);
    }

    this.deviceLayouts.set(layouts);
  }

  /**
   * Valida dimensioni e posizioni minime
   */
  private validateItemBounds(config: { left: number; top: number; width: number; height: number }): { left: number; top: number; width: number; height: number } {
    let { left, top, width, height } = config;
    
    // Assicura dimensioni minime
    width = Math.max(150, width);
    height = Math.max(100, height);
    
    // Assicura posizioni non negative
    left = Math.max(0, left);
    top = Math.max(0, top);
    
    return { left, top, width, height };
  }

  /**
   * Salva tutti i layout dispositivi nel backend con debouncing
   */
  private saveCanvasLayout(): void {
    // Cancella il timeout precedente
    if (this.saveLayoutTimeout) {
      clearTimeout(this.saveLayoutTimeout);
    }

    // Debounce di 500ms - salva solo dopo che l'utente ha finito di muovere/ridimensionare
    this.saveLayoutTimeout = setTimeout(() => {
      const layouts = this.deviceLayouts();
      const multiDeviceConfig: Record<string, Record<string, { left: number; top: number; width: number; height: number }>> = {};

      // Salva layout per ogni dispositivo
      layouts.forEach((itemsMap, deviceId) => {
        const deviceConfig: Record<string, { left: number; top: number; width: number; height: number }> = {};
        
        itemsMap.forEach((item, key) => {
          deviceConfig[key] = {
            left: item.left,
            top: item.top,
            width: item.width,
            height: item.height
          };
        });
        
        multiDeviceConfig[deviceId] = deviceConfig;
      });

      // Salva nel backend
      const projectId = this.project().id;
      this.http.patch(apiUrl(`projects/${projectId}/layout`), {
        layout_config: JSON.stringify(multiDeviceConfig)
      }).subscribe({
        next: () => {
          // Layout salvato con successo
        },
        error: (err) => {
          console.error('Errore nel salvataggio del layout:', err);
        }
      });
    }, 500);
  }

  /**
   * Cleanup quando il componente viene distrutto
   */
  ngOnDestroy(): void {
    // Pulisci event listeners globali se esistono
    document.removeEventListener('mousemove', this.handleDragMoveGlobal);
    document.removeEventListener('mouseup', this.handleMouseUpGlobal);
    
    // Pulisci timeout
    if (this.saveLayoutTimeout) {
      clearTimeout(this.saveLayoutTimeout);
    }
  }
}
