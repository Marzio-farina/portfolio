import { Component, input, output, signal, ViewChild, ElementRef } from '@angular/core';

export interface VideoData {
  file: File | null;
  previewUrl: string | null;
  removed: boolean;
}

@Component({
  selector: 'app-video-uploader',
  standalone: true,
  imports: [],
  templateUrl: './video-uploader.component.html',
  styleUrl: './video-uploader.component.css'
})
export class VideoUploaderComponent {
  // Input: URL video corrente
  videoUrl = input<string | null>(null);
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Input: stato saving (disabilita azioni)
  saving = input<boolean>(false);
  
  // Output: quando viene selezionato un file
  videoSelected = output<VideoData>();
  
  // Output: quando il video viene rimosso
  videoRemoved = output<void>();
  
  // File input reference
  @ViewChild('videoInput') videoInputRef?: ElementRef<HTMLInputElement>;
  
  // Stato interno
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  isDragOver = signal(false);
  isValidDrag = signal(true); // Flag per validare tipo file durante drag
  removed = signal<boolean>(false);
  
  // Progress caricamento video
  videoLoading = signal<boolean>(false);
  videoLoadProgress = signal<number>(0);
  
  /**
   * Apre il file picker
   */
  openFilePicker(): void {
    this.videoInputRef?.nativeElement?.click();
  }
  
  /**
   * Gestisce la selezione file dall'input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.handleSelectedFile(file);
  }
  
  /**
   * Gestisce il file selezionato (validazione e preview)
   */
  private handleSelectedFile(file: File): void {
    // Validazione tipo
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validTypes.includes(file.type)) {
      console.error('Formato video non supportato:', file.type);
      return;
    }
    
    // Validazione dimensione (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('Video troppo grande:', file.size);
      return;
    }
    
    this.selectedFile.set(file);
    this.removed.set(false);
    
    // Crea preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Emetti al parent
    this.videoSelected.emit({
      file: file,
      previewUrl: null,
      removed: false
    });
  }
  
  /**
   * Rimuove il video
   */
  removeVideo(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.removed.set(true);
    if (this.videoInputRef?.nativeElement) {
      this.videoInputRef.nativeElement.value = '';
    }
    
    this.videoRemoved.emit();
  }
  
  /**
   * Drag & Drop handlers con validazione tipo file
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
    
    // Controlla se il file trascinato è un video
    const items = event.dataTransfer?.items;
    if (items && items.length > 0) {
      const item = items[0];
      const isVideo = item.type.startsWith('video/');
      this.isValidDrag.set(isVideo);
    }
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    this.isValidDrag.set(true);
  }
  
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    this.isValidDrag.set(true);
    
    const dt = event.dataTransfer;
    const file = dt?.files?.[0];
    if (!file) return;
    
    // Verifica che sia un video
    if (!file.type.startsWith('video/')) {
      console.error('File non è un video');
      return;
    }
    
    this.handleSelectedFile(file);
  }
  
  /**
   * Gestisce il click sul video per play/pause
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
   * Gestisce inizio caricamento video
   */
  onVideoLoadStart(event: Event): void {
    this.videoLoading.set(true);
    this.videoLoadProgress.set(0);
  }
  
  /**
   * Gestisce progresso caricamento
   */
  onVideoProgress(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video.buffered.length > 0) {
      const buffered = video.buffered.end(0);
      const duration = video.duration;
      if (duration > 0) {
        const progress = (buffered / duration) * 100;
        this.videoLoadProgress.set(Math.round(progress));
      }
    }
  }
  
  /**
   * Gestisce completamento caricamento
   */
  onVideoLoadedData(event: Event): void {
    this.videoLoading.set(false);
    this.videoLoadProgress.set(100);
  }
  
  /**
   * Gestisce errore caricamento
   */
  onVideoError(event: Event): void {
    this.videoLoading.set(false);
    this.videoLoadProgress.set(0);
    console.warn('Errore caricamento video');
  }
  
  /**
   * Ottiene l'URL da visualizzare
   */
  getDisplayUrl(): string | null {
    if (this.removed()) return null;
    return this.previewUrl() || this.videoUrl() || null;
  }
}

