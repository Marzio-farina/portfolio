import { Component, inject, input, output, signal, computed, effect, afterNextRender, ViewChild, ElementRef } from '@angular/core';
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

@Component({
  selector: 'app-project-detail-modal',
  standalone: true,
  imports: [ReactiveFormsModule, Notification],
  templateUrl: './project-detail-modal.html',
  styleUrls: ['./project-detail-modal.css', './project-detail-modal.responsive.css']
})
export class ProjectDetailModal {
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

  constructor() {
    // Inizializza il form
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(50)]],
      category_id: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.maxLength(1000)]]
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
    
    console.log('onSave - File selezionati:', {
      hasPosterFile: !!hasPosterFile,
      hasVideoFile: !!hasVideoFile,
      videoRemoved: videoRemoved,
      posterFileName: hasPosterFile?.name,
      videoFileName: hasVideoFile?.name,
      videoFileSize: hasVideoFile?.size,
      existingVideo: this.project().video,
    });
    
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
        console.log('Aggiungo poster_file al FormData:', hasPosterFile.name, hasPosterFile.size);
        formData.append('poster_file', hasPosterFile);
      }
      if (hasVideoFile) {
        console.log('Aggiungo video_file al FormData:', hasVideoFile.name, hasVideoFile.size);
        formData.append('video_file', hasVideoFile);
      }
      
      // Se il video è stato rimosso, invia un flag speciale
      if (videoRemoved && !hasVideoFile) {
        console.log('Video rimosso - invio flag per rimuovere dal database');
        formData.append('remove_video', 'true');
      }
      
      // Verifica che i file siano stati aggiunti
      console.log('FormData contiene poster_file:', formData.has('poster_file'));
      console.log('FormData contiene video_file:', formData.has('video_file'));
      console.log('FormData contiene remove_video:', formData.has('remove_video'));
      
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
}
