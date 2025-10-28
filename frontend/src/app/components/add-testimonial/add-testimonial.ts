import { Component, inject, signal, output, ViewChild, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TestimonialService } from '../../services/testimonial.service';
import { DefaultAvatarService } from '../../services/default-avatar.service';
import { AvatarData } from '../avatar/avatar';
import { Notification, NotificationType } from '../../components/notification/notification';
import { AvatarEditor, AvatarSelection } from '../avatar-editor/avatar-editor';
import { NgClass } from '@angular/common';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  fieldId: string;
}

@Component({
  selector: 'app-add-testimonial',
  imports: [ReactiveFormsModule, Notification, NgClass, AvatarEditor],
  templateUrl: './add-testimonial.html',
  styleUrls: [
    './add-testimonial.css',
    './add-testimonial.avatar.css',
    './add-testimonial.rating.css',
    './add-testimonial.tooltip.css',
    './add-testimonial.buttons.css',
    './add-testimonial.responsive.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddTestimonial {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private testimonialApi = inject(TestimonialService);
  private defaultAvatarService = inject(DefaultAvatarService);

  @ViewChild('avatarFileInput') avatarFileInputRef?: ElementRef<HTMLInputElement>;

  sending = signal(false);
  sent = signal(false);
  error = signal<string | undefined>(undefined);
  
  // Gestione tooltip
  // Gestione hover rating
  hoverRating = signal<number>(0);
  tooltipVisible: string | null = null;

  // Gestione notifiche multiple
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = false;

  // Gestione campi aggiuntivi (per mobile/tablet)
  showAdditionalFields = signal(false);
  
  // Gestione popup campi opzionali
  showFieldsPopup = signal(false);
  
  // Campi opzionali disponibili (solo per il popup, la visibilità è gestita da showAdditionalFields)
  optionalFields = signal([
    { id: 'author_surname', label: 'Cognome', visible: false },
    { id: 'company', label: 'Azienda', visible: false },
    { id: 'role_company', label: 'Ruolo', visible: false },
    { id: 'avatar', label: 'Avatar', visible: false }
  ]);

  // Output per comunicare con il componente padre (per le notifiche) - non usato in questo caso
  errorChange = output<{message: string, type: 'error' | 'warning' | 'info' | 'success', fieldId: string, action: 'add' | 'remove'} | undefined>();
  successChange = output<string | undefined>();

  form = this.fb.group({
    author_name: ['', [Validators.required, Validators.minLength(2)]],
    author_surname: [''],
    text: ['', [Validators.required, Validators.minLength(10)]],
    role_company: [''],
    company: [''],
    rating: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    avatar_url: [''],
    avatar_file: [null as File | null], // Campo per il file caricato
    icon_id: [null as number | null] // Campo per l'ID dell'icona selezionata
  });

  // Avatar di default disponibili (caricati dal backend)
  private defaultAvatars: AvatarData[] = [];

  // URL dell'immagine caricata dall'utente
  private uploadedAvatarUrl = signal<string | null>(null);

  // Indice dell'avatar di default attualmente selezionato
  private currentDefaultAvatarIndex = signal(0);

  constructor() {
    // Validazione in tempo reale per ogni campo
    this.form.get('author_name')?.valueChanges.subscribe(() => this.validateField('author_name'));
    this.form.get('text')?.valueChanges.subscribe(() => this.validateField('text'));
    this.form.get('rating')?.valueChanges.subscribe(() => this.validateField('rating'));
    
    // Carica gli avatar predefiniti dal backend
    this.defaultAvatarService.getDefaultAvatars().subscribe((avatars: AvatarData[]) => {
      this.defaultAvatars = avatars;
      // Imposta un avatar di default casuale
      this.setRandomDefaultAvatar();
    });
  }

  /**
   * Ottiene l'URL dell'avatar da mostrare
   * Priorità: immagine caricata > URL personalizzato > avatar di default corrente
   */
  getAvatarUrl(): string {
    // Prima controlla se c'è un'immagine caricata
    const uploadedUrl = this.uploadedAvatarUrl();
    if (uploadedUrl) {
      return uploadedUrl;
    }
    
    // Poi controlla se c'è un URL personalizzato
    const customUrl = this.form.get('avatar_url')?.value;
    if (customUrl && customUrl.trim()) {
      return customUrl;
    }
    
    // Infine usa l'avatar di default corrente
    const currentIndex = this.currentDefaultAvatarIndex();
    if (this.defaultAvatars.length > 0 && currentIndex < this.defaultAvatars.length) {
      return this.defaultAvatars[currentIndex].img;
    }
    
    // Fallback se non ci sono avatar caricati
    return '';
  }

  /**
   * Gestisce la selezione di un file immagine
   */
  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Verifica che il file abbia un'estensione valida
      const fileName = file.name.toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        alert('Formato non supportato. Usa solo file JPG, PNG, GIF o WebP');
        input.value = ''; // Reset del file input
        return;
      }
      
      // Tipi MIME accettati
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      
      // Verifica che sia un tipo di immagine valido
      if (!allowedTypes.includes(file.type)) {
        alert('Formato non supportato. Usa solo file JPG, PNG, GIF o WebP');
        input.value = ''; // Reset del file input
        return;
      }
      
      // Verifica che il file sia effettivamente un'immagine
      if (!file.type.startsWith('image/')) {
        alert('Il file selezionato non è un\'immagine valida');
        input.value = ''; // Reset del file input
        return;
      }
      
      // Verifica la dimensione del file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Il file è troppo grande. Massimo 5MB');
        input.value = ''; // Reset del file input
        return;
      }
      
      // Crea un URL temporaneo per l'anteprima
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.uploadedAvatarUrl.set(result);
        
        // Salva il file nel form per l'invio
        this.form.get('avatar_file')?.setValue(file);
        // Pulisci l'avatar_url e icon_id quando si carica un file
        this.form.get('avatar_url')?.setValue('');
        this.form.get('icon_id')?.setValue(null);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Naviga all'avatar di default precedente
   */
  previousDefaultAvatar(): void {
    const currentIndex = this.currentDefaultAvatarIndex();
    const newIndex = currentIndex > 0 ? currentIndex - 1 : this.defaultAvatars.length - 1;
    this.currentDefaultAvatarIndex.set(newIndex);
    this.updateIconId();
    
    // Aggiorna il form con l'avatar selezionato
    this.form.get('avatar_url')?.setValue('');
    this.form.get('avatar_file')?.setValue(null);
    this.uploadedAvatarUrl.set(null);
  }

  /**
   * Naviga all'avatar di default successivo
   */
  nextDefaultAvatar(): void {
    const currentIndex = this.currentDefaultAvatarIndex();
    const newIndex = currentIndex < this.defaultAvatars.length - 1 ? currentIndex + 1 : 0;
    this.currentDefaultAvatarIndex.set(newIndex);
    this.updateIconId();
    
    // Aggiorna il form con l'avatar selezionato
    this.form.get('avatar_url')?.setValue('');
    this.form.get('avatar_file')?.setValue(null);
    this.uploadedAvatarUrl.set(null);
  }

  // Handler per il componente avatar-editor
  onAvatarChange(selection: AvatarSelection): void {
    // Se arriva un file, priorità al file
    if (selection.file) {
      this.uploadedAvatarUrl.set(selection.url ?? null);
      this.form.get('avatar_file')?.setValue(selection.file);
      this.form.get('avatar_url')?.setValue('');
      this.form.get('icon_id')?.setValue(null);
      return;
    }

    // Se selezionata un'icona di default
    if (typeof selection.iconId === 'number') {
      this.uploadedAvatarUrl.set(null);
      this.form.get('avatar_file')?.setValue(null);
      this.form.get('avatar_url')?.setValue('');
      this.form.get('icon_id')?.setValue(selection.iconId);
      return;
    }

    // Se passa solo un URL (fallback)
    if (selection.url) {
      this.uploadedAvatarUrl.set(selection.url);
      this.form.get('avatar_file')?.setValue(null);
      this.form.get('icon_id')?.setValue(null);
      this.form.get('avatar_url')?.setValue(selection.url);
    }
  }

  /**
   * Controlla se si può navigare all'avatar precedente
   */
  canGoToPreviousAvatar(): boolean {
    // Se c'è un'immagine caricata, non mostrare le frecce
    if (this.uploadedAvatarUrl()) {
      return false;
    }
    // Se non ci sono avatar caricati, non mostrare le frecce
    return this.defaultAvatars.length > 1;
  }

  /**
   * Controlla se si può navigare all'avatar successivo
   */
  canGoToNextAvatar(): boolean {
    // Se c'è un'immagine caricata, non mostrare le frecce
    if (this.uploadedAvatarUrl()) {
      return false;
    }
    // Se non ci sono avatar caricati, non mostrare le frecce
    return this.defaultAvatars.length > 1;
  }

  /**
   * Imposta un avatar di default casuale
   */
  private setRandomDefaultAvatar(): void {
    if (this.defaultAvatars.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.defaultAvatars.length);
      this.currentDefaultAvatarIndex.set(randomIndex);
      this.updateIconId();
    } else {
      this.currentDefaultAvatarIndex.set(0);
    }
    // Pulisci i campi avatar quando si imposta un avatar di default
    this.form.get('avatar_url')?.setValue('');
    this.form.get('avatar_file')?.setValue(null);
  }

  /**
   * Aggiorna l'icon_id nel form basandosi sull'avatar attualmente selezionato
   */
  private updateIconId(): void {
    const currentIndex = this.currentDefaultAvatarIndex();
    if (this.defaultAvatars.length > 0 && currentIndex < this.defaultAvatars.length) {
      const selectedAvatar = this.defaultAvatars[currentIndex];
      this.form.get('icon_id')?.setValue(selectedAvatar.id);
    }
  }

  submit() {
    this.error.set(undefined);
    this.onErrorChange(undefined);
    
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showValidationError();
      return;
    }

    this.sending.set(true);
    this.testimonialApi.create$(this.form.value as any).subscribe({
      next: () => {
        this.sent.set(true);
        this.sending.set(false);
        
        // Emetti notifica di successo
        this.onSuccessChange('Recensione inviata con successo!');
        // Naviga alla pagina about passando notifica via navigation state
        this.router.navigate(['/about'], { state: { toast: { message: 'Recensione inviata con successo!', type: 'success' } } });
      },
      error: (err: any) => {
        console.error('[add-testimonial] error', err);
        const errorMessage = err?.error?.message ?? 'Invio non riuscito. Riprova.';
        this.error.set(errorMessage);
        this.onErrorChange({
          message: errorMessage,
          type: 'error',
          fieldId: 'submit',
          action: 'add'
        });
        this.sending.set(false);
      }
    });
  }

  showValidationError() {
    const errors: string[] = [];
    
    if (this.form.get('author_name')?.invalid) {
      errors.push('Inserisci un nome valido (min 2 caratteri)');
      this.onErrorChange({
        message: 'Inserisci un nome valido (min 2 caratteri)',
        type: 'warning',
        fieldId: 'author_name',
        action: 'add'
      });
    }
    if (this.form.get('text')?.invalid) {
      errors.push('Il commento deve contenere almeno 10 caratteri');
      this.onErrorChange({
        message: 'Il commento deve contenere almeno 10 caratteri',
        type: 'info',
        fieldId: 'text',
        action: 'add'
      });
    }
    if (this.form.get('rating')?.invalid) {
      errors.push('Seleziona una valutazione valida');
      this.onErrorChange({
        message: 'Seleziona una valutazione valida',
        type: 'warning',
        fieldId: 'rating',
        action: 'add'
      });
    }
    
    this.error.set(errors.join(', '));
  }

  validateField(fieldName: string) {
    const field = this.form.get(fieldName);
    if (field && field.touched && field.invalid) {
      this.showFieldError(fieldName);
    } else if (field && field.valid) {
      // Se il campo è valido, rimuovi la sua notifica
      this.removeFieldNotification(fieldName);
      this.checkForOtherErrors();
    }
  }

  removeFieldNotification(fieldName: string) {
    this.onErrorChange({
      message: '',
      type: 'success',
      fieldId: fieldName,
      action: 'remove'
    });
  }

  checkForOtherErrors() {
    // Se tutti i campi sono validi, rimuovi l'errore
    if (this.form.valid) {
      this.error.set(undefined);
      this.onErrorChange(undefined);
    }
  }

  showFieldError(fieldName: string) {
    const field = this.form.get(fieldName);
    if (!field || !field.invalid) return;

    let errorMessage = '';
    let errorType: 'error' | 'warning' | 'info' | 'success' = 'error';
    
    if (fieldName === 'author_name') {
      errorMessage = 'Inserisci un nome valido (min 2 caratteri)';
      errorType = 'warning';
    } else if (fieldName === 'text') {
      errorMessage = 'Il commento deve contenere almeno 10 caratteri';
      errorType = 'info';
    } else if (fieldName === 'rating') {
      errorMessage = 'Seleziona una valutazione valida';
      errorType = 'warning';
    }

    if (errorMessage) {
      this.error.set(errorMessage);
      this.onErrorChange({
        message: errorMessage,
        type: errorType,
        fieldId: fieldName,
        action: 'add'
      });
    }
  }

  onFieldBlur(fieldName: string) {
    const field = this.form.get(fieldName);
    if (field) {
      field.markAsTouched();
      this.validateField(fieldName);
    }
  }

  // Metodi per gestire i tooltip
  showTooltip(fieldName: string) {
    this.tooltipVisible = fieldName;
  }

  hideTooltip(fieldName: string) {
    if (this.tooltipVisible === fieldName) {
      this.tooltipVisible = null;
    }
  }

  // Navigazione indietro
  goBack() {
    this.router.navigate(['/about']);
  }

  // Ottiene i campi nascosti in base alla larghezza dello schermo
  private getHiddenFields(): string[] {
    if (typeof window === 'undefined') return [];
    
    const width = window.innerWidth;
    
    // Desktop (>720px): tutti i campi sono visibili, nessuno nascosto
    if (width > 720) {
      return [];
    }
    
    // Tablet (640-720px): Cognome e Avatar sono sempre visibili
    if (width >= 640 && width <= 720) {
      return ['company', 'role_company'];
    }
    
    // Mobile (<640px): Nome è sempre visibile, tutti gli altri nascosti
    if (width < 640) {
      return ['author_surname', 'company', 'role_company', 'avatar'];
    }
    
    return [];
  }
  
  // Ottiene i campi opzionali filtrati in base al dispositivo
  getVisibleOptionalFields() {
    const hiddenFields = this.getHiddenFields();
    return this.optionalFields().filter(field => hiddenFields.includes(field.id));
  }
  
  // Verifica se ci sono campi nascosti da mostrare nel popup
  hasHiddenFields(): boolean {
    return this.getVisibleOptionalFields().length > 0;
  }
  
  // Gestione toggle campi aggiuntivi - apre popup
  toggleAdditionalFields(): void {
    this.showFieldsPopup.set(!this.showFieldsPopup());
  }
  
  // Chiudi popup e applica i cambiamenti
  closeFieldsPopup(): void {
    // Se almeno un campo è selezionato, mostra la row
    const hasAnyField = this.optionalFields().some(f => f.visible);
    this.showAdditionalFields.set(hasAnyField);
    this.showFieldsPopup.set(false);
  }
  
  // Chiudi popup quando si clicca fuori
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.showFieldsPopup()) {
      const target = event.target as HTMLElement;
      // Chiudi se il click è fuori dal popup e dal bottone
      if (!target.closest('.fields-popup') && !target.closest('.toggle-additional-btn')) {
        this.closeFieldsPopup();
      }
    }
  }
  
  // Toggle visibilità di un singolo campo nel popup
  toggleFieldVisibility(fieldId: string): void {
    this.optionalFields.update(fields => 
      fields.map(field => 
        field.id === fieldId ? { ...field, visible: !field.visible } : field
      )
    );
  }
  
  // Verifica se un campo specifico è visibile
  isFieldVisible(fieldId: string): boolean {
    const field = this.optionalFields().find(f => f.id === fieldId);
    return field ? field.visible : false;
  }

  // Gestione notifiche
  private onErrorChange(errorData: {message: string, type: NotificationType, fieldId: string, action: 'add' | 'remove'} | undefined) {
    if (errorData) {
      if (errorData.action === 'add') {
        const currentNotifications = this.notifications();
        
        // Controlla se esiste già una notifica con lo stesso messaggio
        const duplicateMessage = currentNotifications.some(n => n.message === errorData.message);
        
        if (!duplicateMessage) {
          // Aggiungi nuova notifica solo se non esiste già una con lo stesso messaggio
          const newNotification: NotificationItem = {
            id: `${errorData.fieldId}-${Date.now()}`,
            message: errorData.message,
            type: errorData.type,
            timestamp: Date.now(),
            fieldId: errorData.fieldId
          };
          
          // Rimuovi eventuali notifiche precedenti per lo stesso campo
          const filteredNotifications = currentNotifications.filter(n => n.fieldId !== errorData.fieldId);
          
          // Aggiungi la nuova notifica
          this.notifications.set([...filteredNotifications, newNotification]);
          this.showMultipleNotifications = true;
        }
      } else if (errorData.action === 'remove') {
        // Rimuovi notifica per campo specifico
        const currentNotifications = this.notifications();
        const filteredNotifications = currentNotifications.filter(n => n.fieldId !== errorData.fieldId);
        this.notifications.set(filteredNotifications);
      }
    }
  }

  private onSuccessChange(success: string | undefined) {
    if (success) {
      const currentNotifications = this.notifications();
      
      // Controlla se esiste già una notifica di successo con lo stesso messaggio
      const duplicateSuccess = currentNotifications.some(n => n.message === success && n.type === 'success');
      
      if (!duplicateSuccess) {
        // Crea una notifica di successo solo se non esiste già una con lo stesso messaggio
        const successNotification: NotificationItem = {
          id: `success-${Date.now()}`,
          message: success,
          type: 'success',
          timestamp: Date.now(),
          fieldId: 'success'
        };
        
        // Aggiungi alla lista delle notifiche
        this.notifications.set([...currentNotifications, successNotification]);
        this.showMultipleNotifications = true;
      }
    }
  }

  // Metodo per ottenere la notifica più grave per l'icona nell'angolo
  getMostSevereNotification(): NotificationItem | null {
    const currentNotifications = this.notifications();
    if (currentNotifications.length === 0) return null;
    
    // Ordina per gravità: error > warning > info > success
    const severity: NotificationType[] = ['error', 'warning', 'info', 'success'];
    const sorted = currentNotifications.sort((a, b) => {
      return severity.indexOf(a.type) - severity.indexOf(b.type);
    });
    
    return sorted[0];
  }
}
