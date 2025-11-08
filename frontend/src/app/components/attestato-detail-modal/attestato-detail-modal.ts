import { Component, inject, input, output, signal, computed, effect, afterNextRender } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { AttestatoDetailModalService } from '../../services/attestato-detail-modal.service';
import { Attestato } from '../../models/attestato.model';
import { EditModeService } from '../../services/edit-mode.service';
import { AuthService } from '../../services/auth.service';
import { AttestatiService } from '../../services/attestati.service';
import { Notification, NotificationType } from '../notification/notification';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-attestato-detail-modal',
  standalone: true,
  imports: [NgOptimizedImage, ReactiveFormsModule, Notification],
  providers: [NotificationService],
  templateUrl: './attestato-detail-modal.html',
  styleUrls: ['./attestato-detail-modal.css', './attestato-detail-modal.responsive.css']
})
export class AttestatoDetailModal {
  private attestatoDetailModalService = inject(AttestatoDetailModalService);
  private editModeService = inject(EditModeService);
  private authService = inject(AuthService);
  private attestatiService = inject(AttestatiService);
  private fb = inject(FormBuilder);
  protected notificationService = inject(NotificationService);

  // Riceve l'attestato dal servizio tramite computed
  attestato = input.required<Attestato>();

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

  // Form per l'editing
  editForm!: FormGroup;
  isEditing = computed(() => this.editModeService.isEditing());
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  canEdit = computed(() => this.isAuthenticated() && this.isEditing());
  saving = signal(false);
  
  // Data per formattazione date
  readonly todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  /**
   * Chiude la modal
   */
  onClose(): void {
    this.attestatoDetailModalService.close();
    this.closed.emit();
  }

  /**
   * Gestisce il click sul link del badge
   */
  onBadgeClick(event: Event): void {
    event.stopPropagation();
    // Il link aprirà automaticamente in una nuova scheda
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
      // Larghezza = Altezza contenitore * (larghezza immagine / altezza immagine)
      const calculatedWidth = this.containerHeight * (width / height);
      this.containerWidth.set(calculatedWidth);
    }
  }

  constructor() {
    // Inizializza il form
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      issuer: ['', [Validators.maxLength(150)]],
      issued_at: [''],
      expires_at: [''],
      credential_url: ['', [
        (control: AbstractControl): ValidationErrors | null => {
          const value = control.value;
          if (!value || value.trim() === '') return null; // Campo opzionale, valido se vuoto
          const urlPattern = /^https?:\/\/.+/;
          return urlPattern.test(value) ? null : { pattern: true };
        },
        Validators.maxLength(255)
      ]],
      description: ['', [Validators.maxLength(1000)]]
    });

    // Aggiorna il form quando cambia l'attestato
    effect(() => {
      const att = this.attestato();
      if (att && this.editForm) {
        // Popola immediatamente il form
        this.updateFormValues(att);
      }
    });

    // Assicura che il form sia aggiornato anche dopo il primo render
    afterNextRender(() => {
      const att = this.attestato();
      if (att && this.editForm) {
        this.updateFormValues(att);
      }
    });
  }

  /**
   * Aggiorna i valori del form con i dati dell'attestato
   */
  private updateFormValues(att: Attestato): void {
    if (!this.editForm) return;
    
    // Usa setTimeout per assicurarsi che il form sia completamente inizializzato nel DOM
    setTimeout(() => {
      if (this.editForm) {
        this.editForm.patchValue({
          title: att.title || '',
          issuer: att.issuer || '',
          issued_at: att.date ? this.formatDateForInput(att.date) : '',
          expires_at: '', // Non presente nel modello frontend attuale
          credential_url: att.badgeUrl || '',
          description: '' // Non presente nel modello frontend attuale
        }, { emitEvent: false });
      }
    }, 0);
  }

  /**
   * Converte una data dal formato stringa al formato input (yyyy-mm-dd)
   */
  formatDateForInput(dateString: string): string {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }

  /**
   * Formatta la data in formato italiano
   */
  formatDate(dateString?: string | null): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Salva le modifiche all'attestato
   */
  onSave(): void {
    if (this.saving() || this.editForm.invalid) return;

    this.saving.set(true);
    this.notificationService.clear();

    const formValue = this.editForm.getRawValue();
    const updateData: any = {};

    // Invia solo i campi modificati
    if (formValue.title && formValue.title !== this.attestato().title) {
      updateData.title = formValue.title.trim();
    }
    if (formValue.issuer !== (this.attestato().issuer || '')) {
      updateData.issuer = formValue.issuer?.trim() || null;
    }
    if (formValue.issued_at) {
      updateData.issued_at = formValue.issued_at;
    }
    if (formValue.expires_at) {
      updateData.expires_at = formValue.expires_at;
    }
    if (formValue.credential_url !== (this.attestato().badgeUrl || '')) {
      updateData.credential_url = formValue.credential_url?.trim() || null;
    }
    if (formValue.description !== undefined) {
      updateData.description = formValue.description?.trim() || null;
    }

    this.attestatiService.update$(this.attestato().id, updateData).subscribe({
      next: (updatedAttestato) => {
        this.saving.set(false);
        this.notificationService.addSuccess('Attestato aggiornato con successo!');
        
        // IMPORTANTE: Aggiorna prima selectedAttestato per aggiornare il dialog
        // POI marca come modificato per aggiornare la lista (questo evita conflitti)
        this.attestatoDetailModalService.selectedAttestato.set(updatedAttestato);
        
        // Poi marca come modificato per triggerare l'aggiornamento della lista
        // Questo permette all'effect nella pagina attestati di processare l'aggiornamento
        this.attestatoDetailModalService.markAsModified(updatedAttestato);
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message || err?.error?.errors?.message?.[0] || 'Errore durante il salvataggio';
        this.notificationService.add('error', message, 'attestato-update-error');
      }
    });
  }

  /**
   * Annulla le modifiche
   */
  onCancel(): void {
    // Ripristina i valori originali
    const att = this.attestato();
    this.editForm.patchValue({
      title: att.title || '',
      issuer: att.issuer || '',
      issued_at: att.date ? this.formatDateForInput(att.date) : '',
      expires_at: '',
      credential_url: att.badgeUrl || '',
      description: ''
    }, { emitEvent: false });
    this.notificationService.clear();
  }

  getMostSevereNotification() {
    return this.notificationService.getMostSevere();
  }
}

