import { Component, ElementRef, effect, inject, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantRouterService } from '../../services/tenant-router.service';
import { ProjectService } from '../../services/project.service';
import { Notification, NotificationType } from '../notification/notification';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { environment } from '../../../environments/environment';

interface Category {
  id: number;
  title: string;
  description?: string;
}

@Component({
  selector: 'app-add-project',
  standalone: true,
  imports: [ReactiveFormsModule, Notification],
  templateUrl: './add-project.html',
  styleUrls: ['./add-project.css', './add-project.responsive.css']
})
export class AddProject {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private tenantRouter = inject(TenantRouterService);
  private http = inject(HttpClient);

  @ViewChild('posterInput') posterInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInputRef?: ElementRef<HTMLInputElement>;

  addProjectForm: FormGroup;
  uploading = signal(false);
  selectedPosterFile = signal<File | null>(null);
  selectedVideoFile = signal<File | null>(null);
  errorMsg = signal<string | null>(null);
  isDragOverPoster = signal(false);
  isDragOverVideo = signal(false);
  
  categories = signal<Category[]>([]);
  loadingCategories = signal(true);

  notifications = signal<{ id: string; message: string; type: NotificationType; timestamp: number; fieldId: string; }[]>([]);

  constructor() {
    this.addProjectForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(50)]],
      category_id: ['', [Validators.required]],
      description: ['', [Validators.maxLength(1000)]],
      poster_file: [null, Validators.required],
      video_file: [null]
    });

    effect(() => {
      const isUploading = this.uploading();
      const controls = ['title', 'category_id', 'description'];
      controls.forEach(name => {
        const ctrl = this.addProjectForm.get(name);
        if (!ctrl) return;
        isUploading ? ctrl.disable() : ctrl.enable();
      });
    });

    this.loadCategories();
  }

  private loadCategories(): void {
    this.loadingCategories.set(true);
    // Carica le categorie dai progetti esistenti o da un endpoint dedicato
    // Per ora carichiamo da un endpoint dedicato se esiste, altrimenti da progetti
    this.http.get<Category[]>(apiUrl('categories')).pipe(
      map(cats => cats || [])
    ).subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loadingCategories.set(false);
      },
      error: (err) => {
        // Se non esiste l'endpoint, usiamo categorie di default
        this.categories.set([
          { id: 1, title: 'Web' },
          { id: 2, title: 'Mobile' },
          { id: 3, title: 'Design' }
        ]);
        this.loadingCategories.set(false);
        
        // Per 404, non mostriamo notifica (endpoint previsto come opzionale)
        // Per altri errori, mostriamo un warning
        if (err?.status && err.status !== 404) {
          const errorMsg = typeof err?.message === 'string' ? err.message : 'Impossibile caricare le categorie dal server. Usando categorie di default.';
          this.addNotification('categories-load-warning', errorMsg, 'warning');
        }
      }
    });
  }

  goBack(): void {
    this.tenantRouter.navigate(['progetti']);
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
      const errorMessage = 'Formato file non supportato. Usa JPEG, PNG, GIF o WEBP.';
      this.errorMsg.set(errorMessage);
      this.selectedPosterFile.set(null);
      this.addProjectForm.patchValue({ poster_file: null });
      this.addProjectForm.get('poster_file')?.updateValueAndValidity();
      if (this.posterInputRef?.nativeElement) this.posterInputRef.nativeElement.value = '';
      this.addNotification('project.poster_file', errorMessage, 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const errorMessage = 'Il file è troppo grande. Dimensione massima: 5MB.';
      this.errorMsg.set(errorMessage);
      this.selectedPosterFile.set(null);
      this.addProjectForm.patchValue({ poster_file: null });
      this.addProjectForm.get('poster_file')?.updateValueAndValidity();
      if (this.posterInputRef?.nativeElement) this.posterInputRef.nativeElement.value = '';
      this.addNotification('project.poster_file', errorMessage, 'error');
      return;
    }

    this.selectedPosterFile.set(file);
    this.addProjectForm.patchValue({ poster_file: file });
    this.addProjectForm.get('poster_file')?.updateValueAndValidity();
    this.removeNotification('project.poster_file');
    this.errorMsg.set(null);
  }

  private handleSelectedVideoFile(file: File): void {
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validTypes.includes(file.type)) {
      const errorMessage = 'Formato video non supportato. Usa MP4, WEBM o OGG.';
      this.errorMsg.set(errorMessage);
      this.selectedVideoFile.set(null);
      this.addProjectForm.patchValue({ video_file: null });
      this.addProjectForm.get('video_file')?.updateValueAndValidity();
      if (this.videoInputRef?.nativeElement) this.videoInputRef.nativeElement.value = '';
      this.addNotification('project.video_file', errorMessage, 'error');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      const errorMessage = 'Il video è troppo grande. Dimensione massima: 50MB.';
      this.errorMsg.set(errorMessage);
      this.selectedVideoFile.set(null);
      this.addProjectForm.patchValue({ video_file: null });
      this.addProjectForm.get('video_file')?.updateValueAndValidity();
      if (this.videoInputRef?.nativeElement) this.videoInputRef.nativeElement.value = '';
      this.addNotification('project.video_file', errorMessage, 'error');
      return;
    }

    this.selectedVideoFile.set(file);
    this.addProjectForm.patchValue({ video_file: file });
    this.addProjectForm.get('video_file')?.updateValueAndValidity();
    this.removeNotification('project.video_file');
    this.errorMsg.set(null);
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

  openPosterPicker(): void { this.posterInputRef?.nativeElement?.click(); }
  openVideoPicker(): void { this.videoInputRef?.nativeElement?.click(); }

  removePosterFile(): void {
    this.selectedPosterFile.set(null);
    this.addProjectForm.patchValue({ poster_file: null });
    const posterCtrl = this.addProjectForm.get('poster_file');
    posterCtrl?.updateValueAndValidity();
    posterCtrl?.markAsTouched();
    if (this.posterInputRef?.nativeElement) this.posterInputRef.nativeElement.value = '';
    if (posterCtrl?.invalid) this.onFieldBlur('project.poster_file');
  }

  removeVideoFile(): void {
    this.selectedVideoFile.set(null);
    this.addProjectForm.patchValue({ video_file: null });
    const videoCtrl = this.addProjectForm.get('video_file');
    videoCtrl?.updateValueAndValidity();
    if (this.videoInputRef?.nativeElement) this.videoInputRef.nativeElement.value = '';
    this.removeNotification('project.video_file');
  }

  onSubmit(): void {
    if (this.uploading()) return;
    this.notifications.set([]);
    this.errorMsg.set(null);

    if (this.addProjectForm.invalid) {
      this.addProjectForm.markAllAsTouched();
      this.showValidationErrors();
      return;
    }

    this.uploading.set(true);

    const v = this.addProjectForm.getRawValue();
    const formData = new FormData();
    formData.append('title', v.title.trim());
    formData.append('category_id', String(v.category_id));
    if (v.description?.trim()) formData.append('description', v.description.trim());
    if (v.poster_file) formData.append('poster_file', v.poster_file, v.poster_file.name);
    if (v.video_file) formData.append('video_file', v.video_file, v.video_file.name);

    this.projectService.create$(formData).subscribe({
      next: () => {
        this.uploading.set(false);
        this.notifications.set([]);
        this.tenantRouter.navigate(['progetti'], { queryParams: { created: 'true', refresh: '1', t: Date.now() } });
      },
      error: (err: any) => {
        this.uploading.set(false);
        
        let message = 'Errore durante la creazione del progetto';
        const details: string[] = [];
        
        // L'interceptor formatta gli errori e li mette in err.message
        // Il payload originale è in err.payload (se presente)
        const payload = err?.payload || err?.error;
        
        // Estrai messaggi di validazione dal payload
        if (payload?.errors) {
          Object.entries(payload.errors).forEach(([field, messages]) => {
            const list = Array.isArray(messages) ? messages : [messages];
            list.forEach(msg => details.push(`${field}: ${msg}`));
          });
        }
        
        // Estrai messaggio di errore generale
        if (details.length) {
          message = details.join('; ');
        } else if (payload?.message) {
          // Messaggio dal server
          message = payload.message;
        } else if (typeof err?.message === 'string' && err.message) {
          // Messaggio formattato dall'interceptor
          message = err.message;
        } else if (err?.status === 500) {
          message = 'Errore del server durante la creazione del progetto. Riprova più tardi.';
        } else if (err?.status === 403) {
          message = 'Non hai i permessi per creare progetti.';
        } else if (err?.status === 401) {
          message = 'Sessione scaduta. Effettua il login e riprova.';
        }

        // Mostra notifica di errore principale
        this.addNotification('project-create-error', message, 'error');

        // Aggiungi notifiche specifiche per ogni campo con errore di validazione
        if (payload?.errors) {
          Object.entries(payload.errors).forEach(([field, messages]) => {
            const list = Array.isArray(messages) ? messages : [messages];
            list.forEach(msg => {
              const fid = `project.${field}`;
              this.addNotification(fid, `${field}: ${msg}`, 'error');
            });
          });
        }
      }
    });
  }

  onCancel(): void {
    if (!this.uploading()) {
      this.notifications.set([]);
      this.tenantRouter.navigate(['progetti']);
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
      case 'project.title': return this.addProjectForm.get('title');
      case 'project.category_id': return this.addProjectForm.get('category_id');
      case 'project.description': return this.addProjectForm.get('description');
      case 'project.poster_file': return this.addProjectForm.get('poster_file');
      case 'project.video_file': return this.addProjectForm.get('video_file');
      default: return null;
    }
  }

  private fieldErrorMessage(key: string): { message: string; type: NotificationType } {
    const ctrl = this.getControlByKey(key);
    if (!ctrl || !ctrl.errors) return { message: 'Campo non valido.', type: 'error' };
    switch (key) {
      case 'project.title':
        if (ctrl.errors['required']) return { message: 'Il titolo è obbligatorio.', type: 'error' };
        if (ctrl.errors['maxlength']) return { message: 'Il titolo deve essere lungo massimo 50 caratteri.', type: 'error' };
        break;
      case 'project.category_id':
        if (ctrl.errors['required']) return { message: 'La categoria è obbligatoria.', type: 'error' };
        break;
      case 'project.description':
        if (ctrl.errors['maxlength']) return { message: 'La descrizione deve essere lunga massimo 1000 caratteri.', type: 'warning' };
        break;
      case 'project.poster_file':
        if (ctrl.errors['required']) return { message: "L'immagine del poster è obbligatoria.", type: 'error' };
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
    if (this.addProjectForm.get('title')?.invalid) {
      const c = this.addProjectForm.get('title');
      if (c?.errors?.['required']) this.addNotification('project.title', 'Il titolo è obbligatorio.', 'error');
      else if (c?.errors?.['maxlength']) this.addNotification('project.title', 'Il titolo deve essere lungo massimo 50 caratteri.', 'error');
    }
    if (this.addProjectForm.get('category_id')?.invalid) {
      if (this.addProjectForm.get('category_id')?.errors?.['required']) this.addNotification('project.category_id', 'La categoria è obbligatoria.', 'error');
    }
    if (this.addProjectForm.get('poster_file')?.invalid) {
      if (this.addProjectForm.get('poster_file')?.errors?.['required']) this.addNotification('project.poster_file', "L'immagine del poster è obbligatoria.", 'error');
    }
    const desc = this.addProjectForm.get('description');
    if (desc?.invalid && desc.errors?.['maxlength']) this.addNotification('project.description', 'La descrizione deve essere lunga massimo 1000 caratteri.', 'warning');
  }

  getMostSevereNotification() {
    const list = this.notifications();
    if (!list.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }
}

