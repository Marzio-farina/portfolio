import { Component, inject, output, signal } from '@angular/core';
import { ContactService } from '../../services/contact.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AboutProfileService } from '../../services/about-profile.service';

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css'
})
export class ContactForm {
  private fb = inject(FormBuilder);
  private api = inject(ContactService);
  private about = inject(AboutProfileService);

  sending = false;
  sent = false;
  error?: string;
  errorMessage = () => this.error;
  private recipientEmail: string = '';
  
  // Gestione tooltip
  tooltipVisible: string | null = null;
  
  // Output per comunicare con il componente padre
  errorChange = output<{message: string, type: 'error' | 'warning' | 'info' | 'success', fieldId: string, action: 'add' | 'remove'} | undefined>();
  successChange = output<string | undefined>();

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    surname: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    subject: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
    consent: [false, [Validators.requiredTrue]],
    website: ['']
  });

  constructor() {
    // Carica il destinatario dal profilo pubblico (tenant-aware)
    this.about.get$().subscribe({
      next: (p) => {
        this.recipientEmail = (p?.email ?? '').trim();
      }
    });
    // Validazione in tempo reale per ogni campo
    this.form.get('name')?.valueChanges.subscribe(() => this.validateField('name'));
    this.form.get('surname')?.valueChanges.subscribe(() => this.validateField('surname'));
    this.form.get('email')?.valueChanges.subscribe(() => this.validateField('email'));
    this.form.get('message')?.valueChanges.subscribe(() => this.validateField('message'));
    this.form.get('consent')?.valueChanges.subscribe(() => this.validateField('consent'));
  }

  submit() {
    this.error = undefined;
    this.errorChange.emit(this.error);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showValidationError();
      return;
    }
    // honeypot: se è stato riempito, non inviare
    if (this.form.value.website) {
      this.sent = true;
      this.form.reset({ consent: false, website: '' });
      return;
    }

    this.sending = true;
    const payload = { ...(this.form.value as any), toEmail: this.recipientEmail };
    this.api.send(payload).subscribe({
      next: () => {
        this.sent = true;
        this.sending = false;
        this.form.reset({ consent: false, website: '' });
        
        // Emetti notifica di successo
        this.successChange.emit('Messaggio inviato con successo!');
      },
      error: (err) => {
        console.error('[contact] error', err);
        const errorMessage = err?.error?.message ?? 'Invio non riuscito. Riprova.';
        this.error = errorMessage;
        this.errorChange.emit({
          message: errorMessage,
          type: 'error',
          fieldId: 'submit',
          action: 'add'
        });
        this.sending = false;
      }
    });
  }

  showValidationError() {
    const errors = this.getValidationErrors();
    this.error = errors.join(', ');
    
    // Emetti ogni singolo errore come notifica separata
    if (this.form.get('name')?.invalid) {
      this.errorChange.emit({
        message: 'Inserisci un nome valido (min 2 caratteri)',
        type: this.getErrorType('name'),
        fieldId: 'name',
        action: 'add'
      });
    }
    if (this.form.get('surname')?.invalid) {
      this.errorChange.emit({
        message: 'Inserisci un cognome valido (min 2 caratteri)',
        type: this.getErrorType('surname'),
        fieldId: 'surname',
        action: 'add'
      });
    }
    if (this.form.get('email')?.invalid) {
      this.errorChange.emit({
        message: 'Inserisci una email valida',
        type: this.getErrorType('email'),
        fieldId: 'email',
        action: 'add'
      });
    }
    if (this.form.get('message')?.invalid) {
      this.errorChange.emit({
        message: 'Il messaggio deve contenere almeno 10 caratteri',
        type: this.getErrorType('message'),
        fieldId: 'message',
        action: 'add'
      });
    }
    if (this.form.get('consent')?.invalid) {
      this.errorChange.emit({
        message: 'Devi acconsentire al trattamento dei dati',
        type: this.getErrorType('consent'),
        fieldId: 'consent',
        action: 'add'
      });
    }
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    
    if (this.form.get('name')?.invalid) {
      errors.push('Inserisci un nome valido (min 2 caratteri)');
    }
    if (this.form.get('surname')?.invalid) {
      errors.push('Inserisci un cognome valido (min 2 caratteri)');
    }
    if (this.form.get('email')?.invalid) {
      errors.push('Inserisci una email valida');
    }
    if (this.form.get('message')?.invalid) {
      errors.push('Il messaggio deve contenere almeno 10 caratteri');
    }
    if (this.form.get('consent')?.invalid) {
      errors.push('Devi acconsentire al trattamento dei dati');
    }
    
    return errors;
  }

  getErrorType(fieldName: string): 'error' | 'warning' | 'info' | 'success' {
    // Scala di gravità: Error > Warning > Info > Success
    if (fieldName === 'email') {
      return 'error'; // Errori di email sono i più gravi
    }
    if (fieldName === 'consent') {
      return 'warning'; // Consenso è importante
    }
    if (fieldName === 'name' || fieldName === 'surname') {
      return 'warning'; // Nome e cognome sono importanti
    }
    if (fieldName === 'message' || fieldName === 'subject') {
      return 'info'; // Messaggio e subject sono informativi
    }
    
    return 'error'; // Default per errori generici
  }

  clearError() {
    this.error = undefined;
    this.errorChange.emit(this.error);
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
    this.errorChange.emit({
      message: '',
      type: 'success',
      fieldId: fieldName,
      action: 'remove'
    });
  }

  showFieldError(fieldName: string) {
    const field = this.form.get(fieldName);
    if (!field || !field.invalid) return;

    let errorMessage = '';
    
    if (fieldName === 'name') {
      if (field.hasError('required')) {
        errorMessage = 'Inserisci un nome valido (min 2 caratteri)';
      } else if (field.hasError('minlength')) {
        errorMessage = 'Inserisci un nome valido (min 2 caratteri)';
      }
    } else if (fieldName === 'surname') {
      if (field.hasError('required')) {
        errorMessage = 'Inserisci un cognome valido (min 2 caratteri)';
      } else if (field.hasError('minlength')) {
        errorMessage = 'Inserisci un cognome valido (min 2 caratteri)';
      }
    } else if (fieldName === 'email') {
      if (field.hasError('required')) {
        errorMessage = 'Inserisci una email valida';
      } else if (field.hasError('email')) {
        errorMessage = 'Inserisci una email valida';
      }
    } else if (fieldName === 'message') {
      if (field.hasError('required')) {
        errorMessage = 'Il messaggio deve contenere almeno 10 caratteri';
      } else if (field.hasError('minlength')) {
        errorMessage = 'Il messaggio deve contenere almeno 10 caratteri';
      }
    } else if (fieldName === 'consent') {
      if (field.hasError('required')) {
        errorMessage = 'Devi acconsentire al trattamento dei dati';
      }
    }

    // Emetti notifica con tipo e fieldId
    if (errorMessage) {
      this.error = errorMessage;
      this.errorChange.emit({
        message: errorMessage,
        type: this.getErrorType(fieldName),
        fieldId: fieldName,
        action: 'add'
      });
    }
  }

  checkForOtherErrors() {
    // Se tutti i campi sono validi, rimuovi l'errore
    if (this.form.valid) {
      this.error = undefined;
      this.errorChange.emit(undefined);
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

}