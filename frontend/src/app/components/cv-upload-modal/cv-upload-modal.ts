import { Component, ElementRef, effect, inject, output, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CvFileService } from '../../services/cv-file.service';

@Component({
  selector: 'app-cv-upload-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './cv-upload-modal.html',
  styleUrl: './cv-upload-modal.css'
})
export class CvUploadModal {
  private fb = inject(FormBuilder);
  private cvFileService = inject(CvFileService);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // Output per comunicare al componente padre
  uploaded = output<void>();
  cancelled = output<void>();

  uploadForm: FormGroup;
  uploading = signal(false);
  selectedFile = signal<File | null>(null);
  errorMsg = signal<string | null>(null);

  constructor() {
    this.uploadForm = this.fb.group({
      title: ['', [Validators.maxLength(255)]],
      cv_file: [null, Validators.required]
    });

    // Aggiorna lo stato disabled dei form controls quando uploading cambia
    effect(() => {
      const isUploading = this.uploading();
      if (isUploading) {
        this.uploadForm.get('title')?.disable();
      } else {
        this.uploadForm.get('title')?.enable();
      }
    });
  }

  /**
   * Gestisce la selezione di un file PDF
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      return;
    }

    // Verifica che sia un PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.errorMsg.set('Formato non supportato. Usa solo file PDF');
      input.value = '';
      return;
    }

    // Verifica la dimensione del file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.errorMsg.set('Il file è troppo grande. Massimo 10MB');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
    this.uploadForm.patchValue({ cv_file: file });
    this.errorMsg.set(null);
  }

  /**
   * Gestisce l'invio del form
   */
  onSubmit(): void {
    if (this.uploadForm.invalid || !this.selectedFile()) {
      this.errorMsg.set('Seleziona un file PDF valido');
      return;
    }

    const file = this.selectedFile()!;
    const title = this.uploadForm.get('title')?.value?.trim() || undefined;

    this.uploading.set(true);
    this.errorMsg.set(null);

    this.cvFileService.upload$(file, title, true).subscribe({
      next: (response) => {
        if (response.success) {
          this.uploading.set(false);
          this.uploaded.emit();
        } else {
          this.errorMsg.set(response.message || 'Errore durante il caricamento');
          this.uploading.set(false);
        }
      },
      error: (err: any) => {
        // Estrai i dettagli degli errori di validazione da Laravel
        let message = 'Errore durante il caricamento del CV';
        
        if (err?.error?.errors) {
          // Laravel validation errors
          const errors = err.error.errors;
          const errorMessages = Object.values(errors).flat() as string[];
          message = errorMessages.join(', ') || message;
        } else if (err?.error?.message) {
          message = err.error.message;
        } else {
          message = this.getErrorMessage(err) || message;
        }
        
        this.errorMsg.set(message);
        this.uploading.set(false);
      }
    });
  }

  /**
   * Chiude la modal
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Apre il file picker
   */
  openFilePicker(): void {
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.click();
    }
  }

  /**
   * Rimuove il file selezionato
   */
  removeFile(): void {
    this.selectedFile.set(null);
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  /**
   * Estrae il messaggio di errore dall'oggetto errore
   */
  private getErrorMessage(err: any): string | null {
    if (err?.error?.message) {
      return err.error.message;
    }
    if (typeof err?.error === 'string') {
      return err.error;
    }
    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    return null;
  }
}

