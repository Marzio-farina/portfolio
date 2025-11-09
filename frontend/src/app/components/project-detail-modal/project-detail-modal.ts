import { Component, inject, input, output, signal, computed, effect, afterNextRender, ViewChild, ViewChildren, QueryList, ElementRef, untracked, OnDestroy, HostListener } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProjectDetailModalService } from '../../services/project-detail-modal.service';
import { ProjectService } from '../../services/project.service';
import { TechnologyService } from '../../services/technology.service';
import { CategoryService } from '../../services/category.service';
import { EditModeService } from '../../services/edit-mode.service';
import { AuthService } from '../../services/auth.service';
import { CanvasService, CanvasItem, DragState, ResizeState } from '../../services/canvas.service';
import { Progetto, Technology } from '../../core/models/project';
import { Notification, NotificationType } from '../notification/notification';
import { apiUrl } from '../../core/api/api-url';
import { map } from 'rxjs';
import { DeviceSelectorComponent, DevicePreset } from '../device-selector/device-selector.component';
import { PosterUploaderComponent, PosterData } from '../poster-uploader/poster-uploader.component';
import { VideoUploaderComponent, VideoData } from '../video-uploader/video-uploader.component';
import { CustomTextElementComponent } from '../custom-text-element/custom-text-element.component';
import { CustomImageElementComponent, CustomImageData } from '../custom-image-element/custom-image-element.component';
import { CategoryFieldComponent, Category } from '../category-field/category-field.component';
import { TechnologiesSelectorComponent, Technology as TechType } from '../technologies-selector/technologies-selector.component';
import { DescriptionFieldComponent } from '../description-field/description-field.component';
import { TextFormattingToolbarComponent, TextStyle } from '../text-formatting-toolbar/text-formatting-toolbar.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-project-detail-modal',
  standalone: true,
  imports: [ReactiveFormsModule, Notification, DeviceSelectorComponent, PosterUploaderComponent, VideoUploaderComponent, CustomTextElementComponent, CustomImageElementComponent, CategoryFieldComponent, TechnologiesSelectorComponent, DescriptionFieldComponent, TextFormattingToolbarComponent],
  providers: [NotificationService],
  templateUrl: './project-detail-modal.html',
  styleUrls: [
    './project-detail-modal-base.css',
    './project-detail-modal-form.css',
    './project-detail-modal-canvas-devices.css',
    './project-detail-modal.responsive.css'
  ]
})
export class ProjectDetailModal implements OnDestroy {
  private projectDetailModalService = inject(ProjectDetailModalService);
  private projectService = inject(ProjectService);
  private technologyService = inject(TechnologyService);
  private categoryService = inject(CategoryService);
  private editModeService = inject(EditModeService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  canvasService = inject(CanvasService);
  protected notificationService = inject(NotificationService);

  // Accesso a tutti i componenti custom-text per leggere il contenuto
  @ViewChildren(CustomTextElementComponent) customTextElements!: QueryList<CustomTextElementComponent>;

  // Riceve il progetto dal servizio tramite input
  project = input.required<Progetto>();

  // Output per comunicare al componente padre
  closed = output<void>();

  // Aspect ratio per le immagini (gestito dal poster-uploader)
  aspectRatio = signal<string | null>(null);
  isVerticalImage = signal<boolean>(false);
  
  // File selezionati per upload
  selectedPosterFile = signal<File | null>(null); // Gestito da poster-uploader
  selectedVideoFile = signal<File | null>(null); // Gestito da video-uploader
  videoRemoved = signal<boolean>(false); // Gestito da video-uploader

  // Form per l'editing
  editForm!: FormGroup;
  isEditing = computed(() => this.editModeService.isEditing());
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  canEdit = computed(() => this.isAuthenticated() && this.isEditing());
  saving = signal(false);
  
  // Categorie per il select
  categories = signal<Category[]>([]);
  loadingCategories = signal(false);

  // Tecnologie disponibili e selezionate
  availableTechnologies = signal<Technology[]>([]);
  loadingTechnologies = signal(false);
  selectedTechnologyIds = signal<number[]>([]);

  // Gestione canvas con absolute positioning - Attiva automaticamente quando canEdit() è true
  isPreviewMode = signal(false);
  isEditMode = computed(() => this.canEdit() && !this.isPreviewMode());
  isAddToolbarExpanded = signal(false);
  
  // Traccia l'elemento custom text selezionato per la toolbar di formattazione
  selectedCustomTextId = signal<string | null>(null);
  
  // Flag per prevenire la chiusura della toolbar quando il mouse è sopra di essa
  isToolbarHovered = signal<boolean>(false);
  
  
  // Esponi Math per il template
  Math = Math;
  
  // Traccia progetti già caricati per evitare loop
  private loadedProjectIds = new Set<number>();
  
  /**
   * Computed per tutti gli elementi del dispositivo corrente come array
   * Include elementi predefiniti E custom (ora specifici per dispositivo)
   */
  customItemsArray = computed(() => {
    const deviceId = this.canvasService.selectedDevice().id;
    const deviceItems = this.canvasService.deviceLayouts().get(deviceId) || new Map<string, CanvasItem>();
    
    const result: Array<{ key: string; value: CanvasItem }> = [];
    
    // Aggiungi TUTTI gli elementi del dispositivo (predefiniti E custom)
    deviceItems.forEach((item, key) => {
      result.push({ key, value: item });
    });
    
    return result;
  });

  // Calcola altezza dinamica del canvas in base agli elementi
  canvasHeight = computed(() => {
    const items = this.canvasService.canvasItems();
    let maxBottom = 800; // Minimo 800px
    
    items.forEach(item => {
      const bottom = item.top + item.height + 40;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });
    
    if (this.canvasService.drawStartPos() && this.canvasService.drawCurrentPos()) {
      const startPos = this.canvasService.drawStartPos()!;
      const currentPos = this.canvasService.drawCurrentPos()!;
      const drawBottom = Math.max(startPos.y, currentPos.y) + 40;
      maxBottom = Math.max(maxBottom, drawBottom);
    }
    
    return maxBottom;
  });

  // Calcola altezza dinamica del viewport (si espande se necessario)
  viewportHeight = computed(() => {
    const deviceHeight = this.canvasService.selectedDevice().height;
    const contentHeight = this.canvasHeight();
    return Math.max(deviceHeight, contentHeight);
  });

  /**
   * Determina se un elemento è parzialmente o totalmente fuori dall'area visibile del dispositivo
   */
  isItemOutsideViewport(itemId: string): boolean {
    if (!this.isEditMode()) return false;
    return this.canvasService.isItemOutsideViewport(itemId);
  }

  constructor() {
    // Inizializza il form
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(50)]],
      category_id: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.maxLength(1000)]]
    });

    // Carica il layout personalizzato quando il progetto cambia (solo ID progetto come dipendenza)
    effect(() => {
      const currentProject = this.project();
      const projectId = currentProject.id;
      const layoutConfig = currentProject.layout_config;
      
      // NON ricaricare se si sta creando un elemento (per evitare di cancellare il rettangolo di disegno)
      // Usa untracked per non rendere isCreatingElement una dipendenza dell'effect
      if (untracked(() => this.canvasService.isCreatingElement())) {
        return;
      }
      
      // Carica solo se non è già stato caricato per questo progetto
      if (layoutConfig && !this.loadedProjectIds.has(projectId)) {
        untracked(() => {
          // Converti l'oggetto in stringa JSON se necessario
          const layoutConfigJson = typeof layoutConfig === 'string' 
            ? layoutConfig 
            : JSON.stringify(layoutConfig);
          this.loadCanvasLayout(layoutConfigJson, this.project());
          this.loadedProjectIds.add(projectId);
        });
      } else if (!layoutConfig && !this.loadedProjectIds.has(projectId)) {
        untracked(() => {
          this.loadCanvasLayout(null, this.project());
          this.loadedProjectIds.add(projectId);
        });
      }
    });

    // Seleziona automaticamente il dispositivo giusto in base alla larghezza dello schermo (solo in view mode, NON in preview)
    effect(() => {
      const isEdit = this.isEditMode();
      const isPreview = this.isPreviewMode();
      const canEditCheck = this.canEdit();
      
      // Auto-seleziona solo quando:
      // - NON in edit mode (!isEdit)
      // - NON in preview mode (!isPreview)
      // - NON può editare (!canEditCheck) = utente finale
      if (!isEdit && !isPreview && !canEditCheck) {
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
      // NON aggiornare il form se si sta creando un elemento
      // Usa untracked per non rendere isCreatingElement una dipendenza dell'effect
      if (untracked(() => this.canvasService.isCreatingElement())) {
        return;
      }
      
      const proj = this.project();
      if (proj && this.editForm) {
        // Popola immediatamente il form
        this.updateFormValues(proj);
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
   * Carica le tecnologie dal backend usando il servizio con caching
   */
  private loadTechnologies(): void {
    this.loadingTechnologies.set(true);
    
    // Usa TechnologyService che ha caching con shareReplay
    // Questo previene chiamate HTTP duplicate
    this.technologyService.list$().subscribe({
      next: (techs) => {
        this.availableTechnologies.set(techs || []);
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
   * Gestisce i tasti premuti - chiude solo con Escape
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Chiudi solo con Escape, non con Delete/Canc
    if (event.key === 'Escape') {
      // Se la toolbar di formattazione è aperta, chiudi quella prima
      if (this.selectedCustomTextId()) {
        this.closeFormattingToolbar();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Altrimenti chiudi il modal
      this.onClose();
    }
    // Ignora Delete/Backspace per evitare chiusure accidentali durante editing
  }
  
  @HostListener('document:mousedown', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    // Chiudi la toolbar se si clicca fuori da elementi contenteditable e dalla toolbar
    if (!this.selectedCustomTextId()) return;
    
    const target = event.target as HTMLElement;
    
    // Non chiudere se clicca su contenteditable o toolbar
    if (target.hasAttribute('contenteditable') || 
        target.closest('[contenteditable="true"]') ||
        target.closest('.text-formatting-toolbar') ||
        target.closest('.text-formatting-toolbar-wrapper')) {
      return;
    }
    
    // Chiudi la toolbar
    this.closeFormattingToolbar();
  }

  /**
   * Salva le modifiche al progetto
   */
  onSave(): void {
    if (this.saving() || this.editForm.invalid) return;

    // Aggiorna il contenuto di tutti gli elementi custom-text prima di salvare
    this.updateAllCustomTextContent();

    // Pulisci elementi custom vuoti prima di salvare
    this.cleanEmptyCustomElements();
    
    // Salva il layout del canvas PRIMA di salvare il resto
    this.canvasService.saveCanvasLayoutImmediate(this.project().id);

    this.saving.set(true);
    this.notificationService.clear();

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
          this.notificationService.addSuccess('Progetto aggiornato con successo!');
          
          // Pulisci i file selezionati
          this.selectedPosterFile.set(null);
          this.selectedVideoFile.set(null);
          this.videoRemoved.set(false);
          
          // Rimuovi l'ID per forzare il ricaricamento del layout
          this.loadedProjectIds.delete(updatedProject.id);
          
          this.projectDetailModalService.selectedProject.set(updatedProject);
          this.projectDetailModalService.markAsModified(updatedProject);
        },
        error: (err: any) => {
          this.saving.set(false);
          const message = err?.error?.message || err?.error?.errors?.message?.[0] || 'Errore durante il salvataggio';
          this.notificationService.add('error', message, 'project-update-error');
        }
      });
      return;
    }

    // Se non ci sono file, usa il metodo normale
    this.projectService.update$(this.project().id, updateData).subscribe({
      next: (updatedProject) => {
        this.saving.set(false);
        this.notificationService.addSuccess('Progetto aggiornato con successo!');
        
        // Rimuovi l'ID per forzare il ricaricamento del layout
        this.loadedProjectIds.delete(updatedProject.id);
        
        // IMPORTANTE: Aggiorna prima selectedProject per aggiornare il dialog
        // POI marca come modificato per aggiornare la lista (questo evita conflitti)
        this.projectDetailModalService.selectedProject.set(updatedProject);
        
        // Poi marca come modificato per triggerare l'aggiornamento della lista
        this.projectDetailModalService.markAsModified(updatedProject);
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message || err?.error?.errors?.message?.[0] || 'Errore durante il salvataggio';
        this.notificationService.add('error', message, 'project-update-error');
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
    this.notificationService.clear();
    
    // Ripristina anche i file selezionati
    this.selectedPosterFile.set(null);
    this.selectedVideoFile.set(null);
    this.videoRemoved.set(false);
  }
  
  // ================== Gestione upload file (delegata ai componenti) ==================

  getMostSevereNotification() {
    return this.notificationService.getMostSevere();
  }

  // ================== Metodi per Gestione Dispositivi ==================

  /**
   * Seleziona un dispositivo preset
   */
  selectDevice(device: DevicePreset): void {
    this.canvasService.selectedDevice.set(device);
  }
  
  /**
   * Gestisce il cambio dispositivo dal device-selector
   */
  onDeviceSelected(device: DevicePreset): void {
    this.selectDevice(device);
  }
  
  /**
   * Gestisce la selezione poster dal poster-uploader
   */
  onPosterSelected(data: PosterData): void {
    this.selectedPosterFile.set(data.file);
  }
  
  /**
   * Gestisce il calcolo aspect ratio dal poster-uploader
   */
  onAspectRatioCalculated(data: { aspectRatio: string; isVertical: boolean }): void {
    this.aspectRatio.set(data.aspectRatio);
    this.isVerticalImage.set(data.isVertical);
  }
  
  /**
   * Gestisce la selezione video dal video-uploader
   */
  onVideoSelected(data: VideoData): void {
    this.selectedVideoFile.set(data.file);
    this.videoRemoved.set(data.removed);
  }
  
  /**
   * Gestisce la rimozione video dal video-uploader
   */
  onVideoRemoved(): void {
    this.selectedVideoFile.set(null);
    this.videoRemoved.set(true);
    
    // Rimuovi l'elemento video anche dal canvas
    this.canvasService.removeCanvasItem('video');
  }
  
  /**
   * Gestisce il focus su custom-text-element
   */
  onCustomTextFocused(elementId: string): void {
    // Chiudi la toolbar precedente se era aperta per un altro elemento
    if (this.selectedCustomTextId() && this.selectedCustomTextId() !== elementId) {
      this.closeFormattingToolbar();
    }
    this.selectedCustomTextId.set(elementId);
  }
  
  /**
   * Gestisce il blur da custom-text-element
   */
  onCustomTextBlurred(): void {
    // Non chiudere la toolbar se il mouse è sopra di essa
    if (this.isToolbarHovered()) {
      return;
    }
    this.selectedCustomTextId.set(null);
  }
  
  /**
   * Gestisce l'hover sulla toolbar
   */
  onToolbarMouseEnter(): void {
    this.isToolbarHovered.set(true);
  }
  
  onToolbarMouseLeave(): void {
    this.isToolbarHovered.set(false);
  }
  
  /**
   * Chiude la toolbar di formattazione
   */
  closeFormattingToolbar(): void {
    this.selectedCustomTextId.set(null);
    this.isToolbarHovered.set(false);
  }
  
  /**
   * Gestisce il cambio stile dalla toolbar di formattazione
   * (ora gestito direttamente da document.execCommand, questo metodo è deprecato)
   */
  onTextStyleChanged(style: TextStyle): void {
    // Non più necessario, la formattazione è gestita direttamente dal contenteditable
  }
  
  /**
   * Ottiene lo stile dell'elemento custom text selezionato
   * (ora gestito direttamente dalla selezione, ritorna oggetto vuoto)
   */
  getSelectedCustomTextStyle(): TextStyle {
    return {};
  }
  
  /**
   * Verifica se l'elemento custom text selezionato ha contenuto specifico per dispositivo
   */
  getSelectedCustomTextIsDeviceSpecific(): boolean {
    const itemId = this.selectedCustomTextId();
    if (!itemId) return false;
    
    const item = this.canvasService.canvasItems().get(itemId);
    return item?.isDeviceSpecific || false;
  }
  
  /**
   * Ottiene il contenuto corretto per un elemento custom text in base al dispositivo
   * Nota: se isDeviceSpecific, l'elemento esiste solo sul dispositivo corrente
   */
  getCustomTextContent(item: CanvasItem): string {
    return item.content || '';
  }
  
  /**
   * Gestisce il toggle della modalità device-specific per il testo
   */
  onDeviceSpecificToggled(newValue: boolean): void {
    const itemId = this.selectedCustomTextId();
    if (!itemId) return;
    
    this.canvasService.toggleDeviceSpecificContent(itemId);
  }
  
  /**
   * Gestisce la selezione immagine da custom-image-element
   */
  onCustomImageSelected(elementId: string, data: CustomImageData): void {
    const item = this.canvasService.canvasItems().get(elementId);
    const isDeviceSpecific = item?.isDeviceSpecific || false;
    this.updateCustomElementContent(elementId, data.content, isDeviceSpecific);
  }
  
  /**
   * Gestisce la rimozione di un elemento custom
   */
  onCustomElementRemoveRequested(elementId: string): void {
    this.removeCustomElement(elementId);
  }

  /**
   * Seleziona automaticamente il dispositivo in base alla larghezza dello schermo
   * Cerca il dispositivo con layout salvato più vicino alla larghezza corrente
   */
  private selectDeviceByScreenWidth(): void {
    const screenWidth = window.innerWidth;
    const layouts = this.canvasService.deviceLayouts();
    
    // Se ci sono layout salvati, trova quello più adatto
    if (layouts.size > 0) {
      let closestDevice: DevicePreset | undefined = undefined;
      let smallestDifference = Infinity;
      
      // Cerca il dispositivo con layout salvato più vicino alla larghezza attuale
      this.canvasService.devicePresets.forEach((preset: DevicePreset) => {
        if (layouts.has(preset.id)) {
          const difference = Math.abs(preset.width - screenWidth);
          if (difference < smallestDifference) {
            smallestDifference = difference;
            closestDevice = preset;
          }
        }
      });
      
      if (closestDevice !== undefined) {
        this.canvasService.selectedDevice.set(closestDevice);
        return;
      }
    }
    
    // Fallback: selezione basata su range standard
    let selectedPreset: DevicePreset;
    
    if (screenWidth <= 414) {
      selectedPreset = this.canvasService.devicePresets.find(d => d.id === 'mobile') || this.canvasService.devicePresets[1];
    } else if (screenWidth <= 768) {
      selectedPreset = this.canvasService.devicePresets.find(d => d.id === 'tablet') || this.canvasService.devicePresets[2];
    } else if (screenWidth <= 1920) {
      selectedPreset = this.canvasService.devicePresets.find(d => d.id === 'desktop') || this.canvasService.devicePresets[3];
    } else {
      selectedPreset = this.canvasService.devicePresets.find(d => d.id === 'desktop-wide') || this.canvasService.devicePresets[4];
    }
    
    this.canvasService.selectedDevice.set(selectedPreset);
  }


  /**
   * Toggle modalità preview per vedere il risultato senza edit mode
   */
  togglePreviewMode(): void {
    const currentPreviewMode = this.isPreviewMode();
    
    // Se stiamo ENTRANDO in preview mode (da edit a preview)
    if (!currentPreviewMode) {
      // PRIMA controlla se ci sono modifiche non salvate (PRIMA di aggiornare customElements)
      const hasUnsavedChanges = this.hasUnsavedChanges();
      
      // POI aggiorna il contenuto degli elementi custom text nel canvasService
      // (così in preview vedono le modifiche anche se non salvate)
      this.updateAllCustomTextContent();
      
      if (hasUnsavedChanges) {
        // Mostra notifica persistente che avvisa di salvare
        this.notificationService.add('warning', 'Attenzione: hai modifiche non salvate. Clicca "Salva" per salvarle definitivamente.', 'unsaved-changes');
      }
    }
    
    // Toggle preview mode (permetti sempre il passaggio)
    this.isPreviewMode.set(!currentPreviewMode);
  }
  
  /**
   * Controlla se ci sono modifiche non salvate
   */
  private hasUnsavedChanges(): boolean {
    // Controlla se il form è dirty
    if (this.editForm.dirty) {
      return true;
    }
    
    // Controlla se ci sono file selezionati per upload
    if (this.selectedPosterFile() || this.selectedVideoFile() || this.videoRemoved()) {
      return true;
    }
    
    // Controlla se gli elementi custom text hanno contenuto non salvato
    if (this.customTextElements) {
      const deviceId = this.canvasService.selectedDevice().id;
      const deviceLayout = this.canvasService.deviceLayouts().get(deviceId);
      
      for (const component of this.customTextElements) {
        const elementId = component.elementId();
        const currentContent = component.getCurrentContent();
        const savedContent = deviceLayout?.get(elementId)?.content || '';
        
        if (currentContent !== savedContent) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  toggleAddToolbar(): void {
    this.isAddToolbarExpanded.update(prev => !prev);
    
    // Se si espande, aggiungi listener per cliccare fuori
    if (!this.isAddToolbarExpanded()) {
      setTimeout(() => {
        document.addEventListener('click', this.closeAddToolbarOnClickOutside);
      }, 0);
    } else {
      document.removeEventListener('click', this.closeAddToolbarOnClickOutside);
    }
  }

  private closeAddToolbarOnClickOutside = (event: MouseEvent): void => {
    const toolbar = document.querySelector('.add-elements-toolbar');
    if (toolbar && !toolbar.contains(event.target as Node)) {
      this.isAddToolbarExpanded.set(false);
      document.removeEventListener('click', this.closeAddToolbarOnClickOutside);
    }
  }

  /**
   * Inizia la modalità creazione testo
   */
  addCustomText(): void {
    if (!this.isEditMode()) return;
    
    this.canvasService.startElementCreation('text');
    this.isAddToolbarExpanded.set(false);
    document.removeEventListener('click', this.closeAddToolbarOnClickOutside);
  }

  /**
   * Inizia la modalità creazione immagine
   */
  addCustomImage(): void {
    if (!this.isEditMode()) return;
    
    this.canvasService.startElementCreation('image');
    this.isAddToolbarExpanded.set(false);
    document.removeEventListener('click', this.closeAddToolbarOnClickOutside);
  }
  
  /**
   * Avvia la modalità creazione video con drag-to-draw
   */
  addVideoElement(): void {
    if (!this.isEditMode()) return;
    
    this.canvasService.startElementCreation('video');
    this.isAddToolbarExpanded.set(false);
    document.removeEventListener('click', this.closeAddToolbarOnClickOutside);
  }
  
  /**
   * Gestisce il mouse move durante la creazione di un elemento
   */
  onCanvasMouseMove(event: MouseEvent): void {
    const canvas = (event.currentTarget as HTMLElement);
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Aggiorna posizione cursore
    this.canvasService.updateCursorPosition(x, y);
    
    // Se stiamo disegnando, aggiorna il disegno
    if (this.canvasService.drawStartPos()) {
      this.canvasService.updateDrawing(x, y);
    }
  }
  
  /**
   * Gestisce l'inizio del disegno di un elemento
   */
  onCanvasMouseDown(event: MouseEvent): void {
    if (!this.canvasService.isCreatingElement()) return;
    
    const canvas = (event.currentTarget as HTMLElement);
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.canvasService.startDrawing(x, y);
    
    // Aggiungi listener globale per mouseup (caso in cui l'utente rilascia fuori dal canvas)
    document.addEventListener('mouseup', this.onGlobalMouseUp, { once: true });
  }
  
  /**
   * Handler globale per mouseup (cattura anche se rilasciato fuori dal canvas)
   */
  private onGlobalMouseUp = (event: MouseEvent): void => {
    this.onCanvasMouseUp(event);
  };
  
  /**
   * Gestisce la fine del disegno e crea l'elemento
   */
  onCanvasMouseUp(event: MouseEvent): void {
    const newId = this.canvasService.finalizeDrawing();
    if (newId) {
      // L'elemento è ora draggabile/ridimensionabile immediatamente
      // (contenteditable è disabilitato di default)
      // NON salvare automaticamente - salvataggio solo al click del pulsante Salva
      // this.saveCanvasLayout();
    }
  }
  
  /**
   * Annulla la creazione di un elemento
   * NON cancella se si sta già disegnando (per evitare interruzioni durante il drag)
   */
  cancelElementCreation(): void {
    // Se si sta già disegnando (drawStartPos è impostato), NON cancellare
    // Questo evita che il mouseleave interrompa il drag
    if (this.canvasService.drawStartPos()) {
      return;
    }
    
    this.canvasService.cancelElementCreation();
  }

  /**
   * Rimuove un elemento custom dal canvas
   */
  removeCustomElement(itemId: string): void {
    if (!this.isEditMode()) return;
    if (!itemId.startsWith('custom-') && itemId !== 'video') return; // Proteggi elementi base (tranne video)
    
    // Verifica che l'elemento esista prima di rimuoverlo
    const exists = this.canvasService.canvasItems().has(itemId);
    if (!exists) {
      return; // Elemento già rimosso
    }
    
    // Chiudi la toolbar se l'elemento rimosso è quello selezionato
    if (this.selectedCustomTextId() === itemId) {
      this.closeFormattingToolbar();
    }
    
    this.canvasService.removeCanvasItem(itemId);
    
    // NON salvare automaticamente - salvataggio solo al click del pulsante Salva
    // this.saveCanvasLayout();
  }

  /**
   * Aggiorna il contenuto di un elemento custom
   * NON salva automaticamente - il salvataggio avviene solo quando si preme il pulsante Salva
   */
  updateCustomElementContent(itemId: string, content: string, isDeviceSpecific: boolean = false): void {
    if (!this.isEditMode()) return;
    
    this.canvasService.updateCustomElementContent(itemId, content, isDeviceSpecific);
    // Rimosso saveCanvasLayout() - salvataggio solo al click del pulsante Salva
  }

  /**
   * Aggiorna il contenuto di tutti gli elementi custom-text dal DOM
   * Chiamato prima di salvare per assicurarsi di avere il contenuto più recente
   * Il contenuto viene sanitizzato dal componente custom-text-element
   */
  private updateAllCustomTextContent(): void {
    // Usa ViewChildren per accedere ai componenti CustomTextElementComponent
    if (!this.customTextElements) {
      return;
    }

    this.customTextElements.forEach((component) => {
      const elementId = component.elementId();
      const currentContent = component.getCurrentContent();
      const item = this.canvasService.canvasItems().get(elementId);
      
      if (item) {
        const isDeviceSpecific = item.isDeviceSpecific || false;
        this.canvasService.updateCustomElementContent(elementId, currentContent, isDeviceSpecific);
      }
    });
  }
  
  /**
   * Pulisce elementi custom vuoti (senza contenuto)
   */
  private cleanEmptyCustomElements(): void {
    this.canvasService.cleanEmptyCustomElements();
  }

  // ================== Metodi per Canvas con Absolute Positioning ==================

  /**
   * Ottiene lo stile inline per un elemento del canvas
   */
  getItemStyle(itemId: string): { left: number; top: number; width: number; height: number } {
    const item = this.canvasService.canvasItems().get(itemId);
    const result = item || { left: 0, top: 0, width: 200, height: 150 };
    
    if (!item) {
      console.warn(`⚠️ getItemStyle(${itemId}): elemento NON trovato in canvasItems, uso fallback {0,0}`);
    }
    
    return result;
  }

  /**
   * Gestisce il mousedown su un elemento per iniziare il drag
   */
  onItemMouseDown(event: MouseEvent, itemId: string): void {
    if (!this.isEditMode()) return;
    
    // Chiudi la toolbar di formattazione se aperta
    this.closeFormattingToolbar();
    
    // Delega al CanvasService che gestisce tutto
    this.canvasService.startDrag(event, itemId);
  }

  // ================== Metodi per Resize con Absolute Positioning ==================

  /**
   * Gestisce il mousedown su un resize handle
   */
  onResizeHandleMouseDown(event: MouseEvent, itemId: string, handle: string): void {
    if (!this.isEditMode()) return;
    
    // Chiudi la toolbar di formattazione se aperta
    this.closeFormattingToolbar();
    
    // Delega al CanvasService che gestisce tutto
    this.canvasService.startResize(event, itemId, handle);
  }

  // ================== Metodi per Persistenza Layout ==================

  /**
   * Carica il layout dal progetto (delega al servizio)
   */
  private loadCanvasLayout(layoutConfigJson: string | null, project: Progetto): void {
    this.canvasService.loadCanvasLayout(layoutConfigJson, project);
  }

  /**
   * Salva tutti i layout dispositivi nel backend con debouncing
   */
  private saveCanvasLayout(): void {
    const projectId = this.project().id;
    this.canvasService.saveCanvasLayout(projectId);
  }

  /**
   * Cleanup quando il componente viene distrutto
   */
  ngOnDestroy(): void {
    // Reset del servizio canvas (pulisce anche i suoi event listeners)
    this.canvasService.reset();
  }
}
