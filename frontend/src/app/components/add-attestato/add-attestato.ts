import { Component, ElementRef, effect, inject, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AttestatiService } from '../../services/attestati.service';
import { Notification, NotificationType } from '../notification/notification';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-add-attestato',
  standalone: true,
  imports: [ReactiveFormsModule, Notification],
  templateUrl: './add-attestato.html',
  styleUrls: ['./add-attestato.css']
})
export class AddAttestato {
  private fb = inject(FormBuilder);
  private attestatiService = inject(AttestatiService);
  private router = inject(Router);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  addAttestatoForm: FormGroup;
  uploading = signal(false);
  selectedFile = signal<File | null>(null);
  errorMsg = signal<string | null>(null);
  isDragOver = signal(false);

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

    effect(() => {
      const isUploading = this.uploading();
      const controls = ['title','description','issuer','issued_at','expires_at','credential_id','credential_url'];
      controls.forEach(name => {
        const ctrl = this.addAttestatoForm.get(name);
        if (!ctrl) return;
        isUploading ? ctrl.disable() : ctrl.enable();
      });
    });
  }

  goBack(): void {
    this.router.navigate(['/attestati']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.handleSelectedFile(file);
  }

  private handleSelectedFile(file: File): void {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const errorMessage = 'Formato file non supportato. Usa JPEG, PNG, GIF o WEBP.';
      this.errorMsg.set(errorMessage);
      this.selectedFile.set(null);
      this.addAttestatoForm.patchValue({ poster_file: null });
      this.addAttestatoForm.get('poster_file')?.updateValueAndValidity();
      if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = '';
      this.addNotification('attestato.poster_file', errorMessage, 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const errorMessage = 'Il file è troppo grande. Dimensione massima: 5MB.';
      this.errorMsg.set(errorMessage);
      this.selectedFile.set(null);
      this.addAttestatoForm.patchValue({ poster_file: null });
      this.addAttestatoForm.get('poster_file')?.updateValueAndValidity();
      if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = '';
      this.addNotification('attestato.poster_file', errorMessage, 'error');
      return;
    }

    this.selectedFile.set(file);
    this.addAttestatoForm.patchValue({ poster_file: file });
    this.addAttestatoForm.get('poster_file')?.updateValueAndValidity();
    this.removeNotification('attestato.poster_file');
    this.errorMsg.set(null);
  }

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

  openFilePicker(): void { this.fileInputRef?.nativeElement?.click(); }

  removeFile(): void {
    this.selectedFile.set(null);
    this.addAttestatoForm.patchValue({ poster_file: null });
    const posterCtrl = this.addAttestatoForm.get('poster_file');
    posterCtrl?.updateValueAndValidity();
    posterCtrl?.markAsTouched();
    if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = '';
    if (posterCtrl?.invalid) this.onFieldBlur('attestato.poster_file');
  }

  onSubmit(): void {
    if (this.uploading()) return;
    this.notifications.set([]);
    this.errorMsg.set(null);

    if (this.addAttestatoForm.invalid) {
      this.addAttestatoForm.markAllAsTouched();
      this.showValidationErrors();
      return;
    }

    this.uploading.set(true);

    const v = this.addAttestatoForm.getRawValue();
    const formData = new FormData();
    formData.append('title', v.title);
    if (v.description?.trim()) formData.append('description', v.description.trim());
    if (v.issuer?.trim()) formData.append('issuer', v.issuer.trim());
    if (v.issued_at?.toString().trim()) formData.append('issued_at', v.issued_at);
    if (v.expires_at?.toString().trim()) formData.append('expires_at', v.expires_at);
    if (v.credential_id?.trim()) formData.append('credential_id', v.credential_id.trim());
    if (v.credential_url?.trim()) formData.append('credential_url', v.credential_url.trim());
    if (v.poster_file) formData.append('poster_file', v.poster_file, v.poster_file.name);

    this.attestatiService.create$(formData).subscribe({
      next: () => {
        this.uploading.set(false);
        this.notifications.set([]);
        this.router.navigate(['/attestati'], { state: { added: true } });
      },
      error: (err: any) => {
        let message = 'Errore durante la creazione dell\'attestato';
        const details: string[] = [];
        if (err?.error?.errors) {
          Object.entries(err.error.errors).forEach(([field, messages]) => {
            const list = Array.isArray(messages) ? messages : [messages];
            list.forEach(msg => details.push(`${field}: ${msg}`));
          });
        }
        if (details.length) message = details.join('; ');
        else if (err?.error?.message) message = err.error.message;

        if (!environment.production) {
          console.error('Errore creazione attestato:', err);
        }

        this.errorMsg.set(message);
        this.uploading.set(false);
        if (err?.error?.errors) {
          Object.entries(err.error.errors).forEach(([field, messages]) => {
            const list = Array.isArray(messages) ? messages : [messages];
            list.forEach(msg => {
              const fid = `attestato.${field}`;
              this.addNotification(fid, `${field}: ${msg}`, 'error');
            });
          });
        } else {
          this.notifications.update(list => [...list, { id: `global-${Date.now()}`, message, type: 'error', timestamp: Date.now(), fieldId: 'global' }]);
        }
      }
    });
  }

  onCancel(): void {
    if (!this.uploading()) {
      this.notifications.set([]);
      this.router.navigate(['/attestati']);
    }
  }

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
    if (!ctrl || !ctrl.errors) return { message: 'Campo non valido.', type: 'error' };
    switch (key) {
      case 'attestato.title':
        if (ctrl.errors['required']) return { message: 'Il titolo è obbligatorio.', type: 'error' };
        if (ctrl.errors['maxlength']) return { message: 'Il titolo deve essere lungo massimo 150 caratteri.', type: 'error' };
        break;
      case 'attestato.description':
        if (ctrl.errors['maxlength']) return { message: 'La descrizione deve essere lunga massimo 1000 caratteri.', type: 'warning' };
        break;
      case 'attestato.issuer':
        if (ctrl.errors['maxlength']) return { message: "L'ente rilasciante deve essere lungo massimo 150 caratteri.", type: 'warning' };
        break;
      case 'attestato.credential_id':
        if (ctrl.errors['maxlength']) return { message: "L'ID credenziale deve essere lungo massimo 100 caratteri.", type: 'warning' };
        break;
      case 'attestato.credential_url':
        if (ctrl.errors['pattern']) return { message: 'Inserisci un URL valido (es. https://...).', type: 'error' };
        if (ctrl.errors['maxlength']) return { message: "L'URL deve essere lungo massimo 255 caratteri.", type: 'warning' };
        break;
      case 'attestato.poster_file':
        if (ctrl.errors['required']) return { message: "L'immagine dell'attestato è obbligatoria.", type: 'error' };
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
    if (this.addAttestatoForm.get('title')?.invalid) {
      const c = this.addAttestatoForm.get('title');
      if (c?.errors?.['required']) this.addNotification('attestato.title', 'Il titolo è obbligatorio.', 'error');
      else if (c?.errors?.['maxlength']) this.addNotification('attestato.title', 'Il titolo deve essere lungo massimo 150 caratteri.', 'error');
    }
    if (this.addAttestatoForm.get('poster_file')?.invalid) {
      if (this.addAttestatoForm.get('poster_file')?.errors?.['required']) this.addNotification('attestato.poster_file', "L'immagine dell'attestato è obbligatoria.", 'error');
    }
    const desc = this.addAttestatoForm.get('description');
    if (desc?.invalid && desc.errors?.['maxlength']) this.addNotification('attestato.description', 'La descrizione deve essere lunga massimo 1000 caratteri.', 'warning');
    const issuer = this.addAttestatoForm.get('issuer');
    if (issuer?.invalid && issuer.errors?.['maxlength']) this.addNotification('attestato.issuer', "L'ente rilasciante deve essere lungo massimo 150 caratteri.", 'warning');
    const credId = this.addAttestatoForm.get('credential_id');
    if (credId?.invalid && credId.errors?.['maxlength']) this.addNotification('attestato.credential_id', "L'ID credenziale deve essere lungo massimo 100 caratteri.", 'warning');
    const credUrl = this.addAttestatoForm.get('credential_url');
    if (credUrl?.invalid) {
      if (credUrl.errors?.['pattern']) this.addNotification('attestato.credential_url', 'Inserisci un URL valido (es. https://...).', 'error');
      else if (credUrl.errors?.['maxlength']) this.addNotification('attestato.credential_url', "L'URL deve essere lungo massimo 255 caratteri.", 'warning');
    }
  }

  getMostSevereNotification() {
    const list = this.notifications();
    if (!list.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }
}


