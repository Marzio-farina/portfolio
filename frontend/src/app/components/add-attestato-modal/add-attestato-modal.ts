import { Component, ElementRef, effect, inject, output, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttestatiService } from '../../services/attestati.service';
import { Notification, NotificationType } from '../notification/notification';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-add-attestato-modal',
  imports: [ReactiveFormsModule, Notification],
  templateUrl: './add-attestato-modal.html',
  styleUrls: ['./add-attestato-modal.css']
})
export class AddAttestatoModal {
  private fb = inject(FormBuilder);
  private attestatiService = inject(AttestatiService);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // Output per comunicare al componente padre
  created = output<void>();
  cancelled = output<void>();
  errorOccurred = output<{message: string; type: 'error' | 'warning'}>();

  addAttestatoForm: FormGroup;
  uploading = signal(false);
  selectedFile = signal<File | null>(null);
  errorMsg = signal<string | null>(null);

  // Notifiche multiple (stile auth component)
  notifications = signal<{ id: string; message: string; type: NotificationType; timestamp: number; fieldId: string; }[]>([]);

  constructor() {
    this.addAttestatoForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', [Validators.maxLength(1000)]],
      issuer: ['', [Validators.maxLength(150)]],
      issued_at: [''],
      expires_at: [''],
      credential_id: ['', [Validators.maxLength(100)]],
      credential_url: ['', [Validators.pattern('https?://.+'), Validators.maxLength(255)]],
      poster_file: [null, Validators.required]
    });

    // Aggiorna lo stato disabled dei form controls quando uploading cambia
    effect(() => {
      const isUploading = this.uploading();
      if (isUploading) {
        this.addAttestatoForm.get('title')?.disable();
        this.addAttestatoForm.get('description')?.disable();
        this.addAttestatoForm.get('issuer')?.disable();
        this.addAttestatoForm.get('issued_at')?.disable();
        this.addAttestatoForm.get('expires_at')?.disable();
        this.addAttestatoForm.get('credential_id')?.disable();
        this.addAttestatoForm.get('credential_url')?.disable();
      } else {
        this.addAttestatoForm.get('title')?.enable();
        this.addAttestatoForm.get('description')?.enable();
        this.addAttestatoForm.get('issuer')?.enable();
        this.addAttestatoForm.get('issued_at')?.enable();
        this.addAttestatoForm.get('expires_at')?.enable();
        this.addAttestatoForm.get('credential_id')?.enable();
        this.addAttestatoForm.get('credential_url')?.enable();
      }
    });
  }

  /**
   * Gestisce la selezione di un file immagine
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      return;
    }

    // Valida tipo file
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const errorMessage = 'Formato file non supportato. Usa JPEG, PNG, GIF o WEBP.';
      this.errorMsg.set(errorMessage);
      this.selectedFile.set(null);
      this.addAttestatoForm.patchValue({ poster_file: null });
      const posterFileControl = this.addAttestatoForm.get('poster_file');
      if (posterFileControl) {
        posterFileControl.updateValueAndValidity();
        posterFileControl.markAsTouched();
      }
      if (this.fileInputRef?.nativeElement) {
        this.fileInputRef.nativeElement.value = '';
      }
      // Aggiungi notifica interna
      this.addNotification('attestato.poster_file', errorMessage, 'error');
      return;
    }

    // Valida dimensione (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const errorMessage = 'Il file è troppo grande. Dimensione massima: 5MB.';
      this.errorMsg.set(errorMessage);
      this.selectedFile.set(null);
      this.addAttestatoForm.patchValue({ poster_file: null });
      const posterFileControl = this.addAttestatoForm.get('poster_file');
      if (posterFileControl) {
        posterFileControl.updateValueAndValidity();
        posterFileControl.markAsTouched();
      }
      if (this.fileInputRef?.nativeElement) {
        this.fileInputRef.nativeElement.value = '';
      }
      // Aggiungi notifica interna
      this.addNotification('attestato.poster_file', errorMessage, 'error');
      return;
    }

    this.selectedFile.set(file);
    this.addAttestatoForm.patchValue({ poster_file: file });
    // Aggiorna lo stato del controllo per triggerare la validazione
    const posterFileControl = this.addAttestatoForm.get('poster_file');
    if (posterFileControl) {
      posterFileControl.updateValueAndValidity();
    }
    // Rimuovi eventuali notifiche di errore per il file
    this.removeNotification('attestato.poster_file');
    this.errorMsg.set(null);
  }

  /**
   * Apre il file picker
   */
  openFilePicker(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  /**
   * Rimuove il file selezionato
   */
  removeFile(): void {
    this.selectedFile.set(null);
    this.addAttestatoForm.patchValue({ poster_file: null });
    // Aggiorna lo stato del controllo per triggerare la validazione
    const posterFileControl = this.addAttestatoForm.get('poster_file');
    if (posterFileControl) {
      posterFileControl.updateValueAndValidity();
      posterFileControl.markAsTouched();
    }
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    // Se il campo è obbligatorio e non c'è file, aggiungi notifica
    if (posterFileControl?.invalid) {
      this.onFieldBlur('attestato.poster_file');
    }
  }

  /**
   * Gestisce l'invio del form
   */
  onSubmit(): void {
    if (this.uploading()) {
      return;
    }

    // Pulisci notifiche precedenti
    this.notifications.set([]);
    this.errorMsg.set(null);

    // Controlla se il form è valido
    if (this.addAttestatoForm.invalid) {
      // Segna tutti i campi come touched per mostrare gli errori
      this.addAttestatoForm.markAllAsTouched();
      // Mostra errori di validazione
      this.showValidationErrors();
      return;
    }

    this.uploading.set(true);

    const formValue = this.addAttestatoForm.getRawValue();
    const formData = new FormData();

    // Aggiungi tutti i campi al FormData
    formData.append('title', formValue.title);
    if (formValue.description && formValue.description.trim()) {
      formData.append('description', formValue.description.trim());
    }
    if (formValue.issuer && formValue.issuer.trim()) {
      formData.append('issuer', formValue.issuer.trim());
    }
    // Date: invia solo se presenti e non vuote
    if (formValue.issued_at && formValue.issued_at.toString().trim()) {
      formData.append('issued_at', formValue.issued_at);
    }
    if (formValue.expires_at && formValue.expires_at.toString().trim()) {
      formData.append('expires_at', formValue.expires_at);
    }
    if (formValue.credential_id && formValue.credential_id.trim()) {
      formData.append('credential_id', formValue.credential_id.trim());
    }
    if (formValue.credential_url && formValue.credential_url.trim()) {
      formData.append('credential_url', formValue.credential_url.trim());
    }

    // Aggiungi il file se presente (obbligatorio)
    if (formValue.poster_file) {
      formData.append('poster_file', formValue.poster_file, formValue.poster_file.name);
    } else {
      // Questo non dovrebbe mai accadere perché il form è validato
      console.error('poster_file mancante durante l\'invio del form');
    }

    // Invia la richiesta
    this.attestatiService.create$(formData).subscribe({
      next: () => {
        this.uploading.set(false);
        this.notifications.set([]); // Pulisci notifiche
        this.created.emit();
      },
      error: (err: any) => {
        let message = 'Errore durante la creazione dell\'attestato';
        const errorDetails: string[] = [];
        
        // Estrai errori di validazione Laravel
        if (err?.error?.errors) {
          const errors = err.error.errors;
          Object.entries(errors).forEach(([field, messages]) => {
            const fieldMessages = Array.isArray(messages) ? messages : [messages];
            fieldMessages.forEach(msg => {
              errorDetails.push(`${field}: ${msg}`);
            });
          });
        }
        
        // Se ci sono errori dettagliati, usali
        if (errorDetails.length > 0) {
          message = errorDetails.join('; ');
        } else if (err?.error?.message) {
          message = err.error.message;
        }
        
        // Log dettagliato in sviluppo
        if (!environment.production) {
          console.error('Errore 422 - Dettagli validazione:', {
            error: err.error,
            errors: err?.error?.errors,
            message: err?.error?.message
          });
        }
        
        this.errorMsg.set(message);
        this.uploading.set(false);
        
        // Aggiungi notifiche specifiche per ogni campo con errore
        if (err?.error?.errors) {
          Object.entries(err.error.errors).forEach(([field, messages]) => {
            const fieldMessages = Array.isArray(messages) ? messages : [messages];
            fieldMessages.forEach(msg => {
              const fieldId = `attestato.${field}`;
              this.addNotification(fieldId, `${field}: ${msg}`, 'error');
            });
          });
        } else {
          // Notifica generica se non ci sono errori per campo
          this.notifications.update(list => [...list, { 
            id: `global-${Date.now()}`, 
            message, 
            type: 'error', 
            timestamp: Date.now(), 
            fieldId: 'global' 
          }]);
        }
        
        // Emetti anche al componente padre per compatibilità
        this.errorOccurred.emit({ message, type: 'error' });
      }
    });
  }

  /**
   * Gestisce l'annullamento
   */
  onCancel(): void {
    if (!this.uploading()) {
      this.notifications.set([]); // Pulisci notifiche
      this.cancelled.emit();
    }
  }

  // ===== Gestione notifiche (stile auth component) =====

  /**
   * Gestisce il blur di un campo
   */
  onFieldBlur(fieldKey: string): void {
    const ctrl = this.getControlByKey(fieldKey);
    if (!ctrl) return;
    ctrl.markAsTouched();
    if (ctrl.invalid) {
      const { message, type } = this.fieldErrorMessage(fieldKey);
      this.addNotification(fieldKey, message, type);
    } else {
      this.removeNotification(fieldKey);
    }
  }

  private getControlByKey(key: string) {
    switch (key) {
      case 'attestato.title': return this.addAttestatoForm.get('title');
      case 'attestato.description': return this.addAttestatoForm.get('description');
      case 'attestato.issuer': return this.addAttestatoForm.get('issuer');
      case 'attestato.issued_at': return this.addAttestatoForm.get('issued_at');
      case 'attestato.expires_at': return this.addAttestatoForm.get('expires_at');
      case 'attestato.credential_id': return this.addAttestatoForm.get('credential_id');
      case 'attestato.credential_url': return this.addAttestatoForm.get('credential_url');
      case 'attestato.poster_file': return this.addAttestatoForm.get('poster_file');
      default: return null;
    }
  }

  private fieldErrorMessage(key: string): { message: string; type: NotificationType } {
    const ctrl = this.getControlByKey(key);
    if (!ctrl || !ctrl.errors) {
      return { message: 'Campo non valido.', type: 'error' };
    }

    switch (key) {
      case 'attestato.title':
        if (ctrl.errors['required']) {
          return { message: 'Il titolo è obbligatorio.', type: 'error' };
        }
        if (ctrl.errors['maxlength']) {
          return { message: 'Il titolo deve essere lungo massimo 150 caratteri.', type: 'error' };
        }
        break;
      case 'attestato.description':
        if (ctrl.errors['maxlength']) {
          return { message: 'La descrizione deve essere lunga massimo 1000 caratteri.', type: 'warning' };
        }
        break;
      case 'attestato.issuer':
        if (ctrl.errors['maxlength']) {
          return { message: 'L\'ente rilasciante deve essere lungo massimo 150 caratteri.', type: 'warning' };
        }
        break;
      case 'attestato.credential_id':
        if (ctrl.errors['maxlength']) {
          return { message: 'L\'ID credenziale deve essere lungo massimo 100 caratteri.', type: 'warning' };
        }
        break;
      case 'attestato.credential_url':
        if (ctrl.errors['pattern']) {
          return { message: 'Inserisci un URL valido (es. https://...).', type: 'error' };
        }
        if (ctrl.errors['maxlength']) {
          return { message: 'L\'URL deve essere lungo massimo 255 caratteri.', type: 'warning' };
        }
        break;
      case 'attestato.poster_file':
        if (ctrl.errors['required']) {
          return { message: 'L\'immagine dell\'attestato è obbligatoria.', type: 'error' };
        }
        break;
    }

    return { message: 'Compila correttamente il campo.', type: 'error' };
  }

  private addNotification(fieldId: string, message: string, type: NotificationType): void {
    const now = Date.now();
    this.notifications.update(list => {
      const filtered = list.filter(n => n.fieldId !== fieldId);
      return [...filtered, { id: `${fieldId}-${now}`, message, type, timestamp: now, fieldId }];
    });
  }

  private removeNotification(fieldId: string): void {
    this.notifications.update(list => list.filter(n => n.fieldId !== fieldId));
  }

  private showValidationErrors(): void {
    // Titolo
    if (this.addAttestatoForm.get('title')?.invalid) {
      const titleCtrl = this.addAttestatoForm.get('title');
      if (titleCtrl?.errors?.['required']) {
        this.addNotification('attestato.title', 'Il titolo è obbligatorio.', 'error');
      } else if (titleCtrl?.errors?.['maxlength']) {
        this.addNotification('attestato.title', 'Il titolo deve essere lungo massimo 150 caratteri.', 'error');
      }
    }

    // Immagine
    if (this.addAttestatoForm.get('poster_file')?.invalid) {
      if (this.addAttestatoForm.get('poster_file')?.errors?.['required']) {
        this.addNotification('attestato.poster_file', 'L\'immagine dell\'attestato è obbligatoria.', 'error');
      }
    }

    // Altri campi con validazioni maxlength
    const descriptionCtrl = this.addAttestatoForm.get('description');
    if (descriptionCtrl?.invalid && descriptionCtrl.errors?.['maxlength']) {
      this.addNotification('attestato.description', 'La descrizione deve essere lunga massimo 1000 caratteri.', 'warning');
    }

    const issuerCtrl = this.addAttestatoForm.get('issuer');
    if (issuerCtrl?.invalid && issuerCtrl.errors?.['maxlength']) {
      this.addNotification('attestato.issuer', 'L\'ente rilasciante deve essere lungo massimo 150 caratteri.', 'warning');
    }

    const credentialIdCtrl = this.addAttestatoForm.get('credential_id');
    if (credentialIdCtrl?.invalid && credentialIdCtrl.errors?.['maxlength']) {
      this.addNotification('attestato.credential_id', 'L\'ID credenziale deve essere lungo massimo 100 caratteri.', 'warning');
    }

    const credentialUrlCtrl = this.addAttestatoForm.get('credential_url');
    if (credentialUrlCtrl?.invalid) {
      if (credentialUrlCtrl.errors?.['pattern']) {
        this.addNotification('attestato.credential_url', 'Inserisci un URL valido (es. https://...).', 'error');
      } else if (credentialUrlCtrl.errors?.['maxlength']) {
        this.addNotification('attestato.credential_url', 'L\'URL deve essere lungo massimo 255 caratteri.', 'warning');
      }
    }
  }

  getMostSevereNotification() {
    const list = this.notifications();
    if (!list.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }
}

