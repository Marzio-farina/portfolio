import { Component, input, output, signal, ElementRef, ViewChild } from '@angular/core';

export interface CustomImageData {
  file: File | null;
  previewUrl: string | null;
  content: string;
}

@Component({
  selector: 'app-custom-image-element',
  standalone: true,
  imports: [],
  templateUrl: './custom-image-element.component.html',
  styleUrl: './custom-image-element.component.css'
})
export class CustomImageElementComponent {
  // Input: ID univoco dell'elemento
  elementId = input.required<string>();
  
  // Input: URL immagine corrente
  imageUrl = input<string>('');
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Input: stato saving
  saving = input<boolean>(false);
  
  // Output: quando viene selezionata un'immagine
  imageSelected = output<CustomImageData>();
  
  // File input reference
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  
  // Stato interno
  isDragOver = signal(false);
  
  /**
   * Apre il file picker
   */
  openFilePicker(): void {
    this.fileInputRef?.nativeElement?.click();
  }
  
  /**
   * Gestisce la selezione file
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.handleSelectedFile(file);
  }
  
  /**
   * Gestisce il file selezionato
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
    
    // Crea preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      this.imageSelected.emit({
        file: file,
        previewUrl: previewUrl,
        content: previewUrl
      });
    };
    reader.readAsDataURL(file);
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
}

