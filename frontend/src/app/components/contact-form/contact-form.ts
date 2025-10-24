import { Component, inject, output } from '@angular/core';
import { ContactService } from '../../services/contact.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css'
})
export class ContactForm {
  private fb = inject(FormBuilder);
  private api = inject(ContactService);

  sending = false;
  sent = false;
  error?: string;
  errorMessage = () => this.error;
  
  // Output per comunicare con il componente padre
  errorChange = output<string | undefined>();

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
    this.api.send(this.form.value as any).subscribe({
      next: () => {
        this.sent = true;
        this.sending = false;
        this.form.reset({ consent: false, website: '' });
      },
      error: (err) => {
        console.error('[contact] error', err);
        this.error = err?.error?.message ?? 'Invio non riuscito. Riprova.';
        this.errorChange.emit(this.error);
        this.sending = false;
      }
    });
  }

  showValidationError() {
    const errors = this.getValidationErrors();
    this.error = errors.join(', ');
    this.errorChange.emit(this.error);
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

  clearError() {
    this.error = undefined;
    this.errorChange.emit(this.error);
  }

  validateField(fieldName: string) {
    const field = this.form.get(fieldName);
    if (field && field.touched && field.invalid) {
      this.showFieldError(fieldName);
    } else if (field && field.valid) {
      // Se il campo è valido, controlla se ci sono altri errori
      this.checkForOtherErrors();
    }
  }

  showFieldError(fieldName: string) {
    const field = this.form.get(fieldName);
    if (!field || !field.invalid) return;

    let errorMessage = '';
    
    if (fieldName === 'name') {
      if (field.hasError('required')) {
        errorMessage = 'Il nome è obbligatorio';
      } else if (field.hasError('minlength')) {
        errorMessage = 'Il nome deve contenere almeno 2 caratteri';
      }
    } else if (fieldName === 'surname') {
      if (field.hasError('required')) {
        errorMessage = 'Il cognome è obbligatorio';
      } else if (field.hasError('minlength')) {
        errorMessage = 'Il cognome deve contenere almeno 2 caratteri';
      }
    } else if (fieldName === 'email') {
      if (field.hasError('required')) {
        errorMessage = 'L\'email è obbligatoria';
      } else if (field.hasError('email')) {
        errorMessage = 'Inserisci una email valida';
      }
    } else if (fieldName === 'message') {
      if (field.hasError('required')) {
        errorMessage = 'Il messaggio è obbligatorio';
      } else if (field.hasError('minlength')) {
        errorMessage = 'Il messaggio deve contenere almeno 10 caratteri';
      }
    } else if (fieldName === 'consent') {
      if (field.hasError('required')) {
        errorMessage = 'Devi acconsentire al trattamento dei dati';
      }
    }

    this.error = errorMessage;
    this.errorChange.emit(this.error);
  }

  checkForOtherErrors() {
    // Se tutti i campi sono validi, rimuovi l'errore
    if (this.form.valid) {
      this.error = undefined;
      this.errorChange.emit(this.error);
    }
  }

  onFieldBlur(fieldName: string) {
    const field = this.form.get(fieldName);
    if (field) {
      field.markAsTouched();
      this.validateField(fieldName);
    }
  }
}