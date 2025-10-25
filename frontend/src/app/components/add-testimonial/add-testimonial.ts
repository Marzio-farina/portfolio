import { Component, inject, signal, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TestimonialService } from '../../services/testimonial.service';
import { Notification, NotificationType } from '../../components/notification/notification';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  fieldId: string;
}

@Component({
  selector: 'app-add-testimonial',
  imports: [ReactiveFormsModule, Notification],
  templateUrl: './add-testimonial.html',
  styleUrl: './add-testimonial.css'
})
export class AddTestimonial {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private testimonialApi = inject(TestimonialService);

  sending = signal(false);
  sent = signal(false);
  error = signal<string | undefined>(undefined);
  
  // Gestione tooltip
  tooltipVisible: string | null = null;

  // Gestione notifiche multiple
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = false;

  // Output per comunicare con il componente padre (per le notifiche) - non usato in questo caso
  errorChange = output<{message: string, type: 'error' | 'warning' | 'info' | 'success', fieldId: string, action: 'add' | 'remove'} | undefined>();
  successChange = output<string | undefined>();

  form = this.fb.group({
    author_name: ['', [Validators.required, Validators.minLength(2)]],
    author_surname: [''],
    text: ['', [Validators.required, Validators.minLength(10)]],
    role_company: [''],
    company: [''],
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    avatar_url: ['']
  });

  constructor() {
    // Validazione in tempo reale per ogni campo
    this.form.get('author_name')?.valueChanges.subscribe(() => this.validateField('author_name'));
    this.form.get('text')?.valueChanges.subscribe(() => this.validateField('text'));
    this.form.get('rating')?.valueChanges.subscribe(() => this.validateField('rating'));
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
        
        // Dopo 2 secondi torna alla pagina about
        setTimeout(() => {
          this.router.navigate(['/about']);
        }, 2000);
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
