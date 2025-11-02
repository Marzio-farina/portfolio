import { Component, input, output, signal, ViewChild, ElementRef } from '@angular/core';

export interface PosterData {
  file: File | null;
  previewUrl: string | null;
}

@Component({
  selector: 'app-poster-uploader',
  standalone: true,
  imports: [],
  templateUrl: './poster-uploader.component.html',
  styleUrl: './poster-uploader.component.css'
})
export class PosterUploaderComponent {
  // Input: URL poster corrente
  posterUrl = input<string | null>(null);
  
  // Input: titolo progetto (per alt text)
  projectTitle = input<string>('');
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Input: stato saving (disabilita azioni)
  saving = input<boolean>(false);
  
  // Output: quando viene selezionato un file
  posterSelected = output<PosterData>();
  
  // Output: quando c'è un errore di caricamento
  loadError = output<boolean>();
  
  // Output: quando viene calcolato l'aspect ratio
  aspectRatioCalculated = output<{ aspectRatio: string; isVertical: boolean }>();
  
  // File input reference
  @ViewChild('posterInput') posterInputRef?: ElementRef<HTMLInputElement>;
  
  // Stato interno
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  isDragOver = signal(false);
  imageLoadError = signal<boolean>(false);
  aspectRatio = signal<string | null>(null);
  isVerticalImage = signal<boolean>(false);
  containerHeight = 300;
  containerWidth = signal<number | null>(null);
  
  /**
   * Apre il file picker
   */
  openFilePicker(): void {
    this.posterInputRef?.nativeElement?.click();
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
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.error('Formato file non supportato:', file.type);
      return;
    }
    
    // Validazione dimensione (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('File troppo grande:', file.size);
      return;
    }
    
    this.selectedFile.set(file);
    
    // Crea preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Emetti al parent
    this.posterSelected.emit({
      file: file,
      previewUrl: null
    });
  }
  
  /**
   * Gestisce il caricamento dell'immagine per calcolare aspect ratio
   */
  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    
    if (img.naturalWidth && img.naturalHeight) {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      
      // Calcola aspect ratio
      const ar = `${width} / ${height}`;
      this.aspectRatio.set(ar);
      
      // Determina se verticale
      const isVertical = height > width;
      this.isVerticalImage.set(isVertical);
      
      // Calcola larghezza contenitore
      const calculatedWidth = (this.containerHeight * width) / height;
      this.containerWidth.set(calculatedWidth);
      
      // Reset errore
      this.imageLoadError.set(false);
      
      // Emetti al parent
      this.aspectRatioCalculated.emit({
        aspectRatio: ar,
        isVertical: isVertical
      });
    }
  }
  
  /**
   * Gestisce errore caricamento immagine
   */
  onImageError(ev: Event): void {
    this.imageLoadError.set(true);
    this.loadError.emit(true);
    console.warn('Errore caricamento immagine');
  }
  
  /**
   * Drag & Drop handlers
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }
  
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    
    const dt = event.dataTransfer;
    const file = dt?.files?.[0];
    if (!file) return;
    this.handleSelectedFile(file);
  }
  
  /**
   * Ottiene l'URL da visualizzare (preview o originale)
   */
  getDisplayUrl(): string | null {
    return this.previewUrl() || this.posterUrl() || null;
  }
}

