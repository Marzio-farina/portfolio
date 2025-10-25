import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TestimonialService } from '../../services/testimonial.service';

@Component({
  selector: 'app-add-testimonial',
  imports: [ReactiveFormsModule],
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
        
        // Dopo 2 secondi torna alla pagina about
        setTimeout(() => {
          this.router.navigate(['/about']);
        }, 2000);
      },
      error: (err: any) => {
        console.error('[add-testimonial] error', err);
        const errorMessage = err?.error?.message ?? 'Invio non riuscito. Riprova.';
        this.error.set(errorMessage);
        this.sending.set(false);
      }
    });
  }

  showValidationError() {
    const errors: string[] = [];
    
    if (this.form.get('author_name')?.invalid) {
      errors.push('Inserisci un nome valido (min 2 caratteri)');
    }
    if (this.form.get('text')?.invalid) {
      errors.push('Il commento deve contenere almeno 10 caratteri');
    }
    if (this.form.get('rating')?.invalid) {
      errors.push('Seleziona una valutazione valida');
    }
    
    this.error.set(errors.join(', '));
  }

  validateField(fieldName: string) {
    const field = this.form.get(fieldName);
    if (field && field.touched && field.invalid) {
      this.showFieldError(fieldName);
    }
  }

  showFieldError(fieldName: string) {
    const field = this.form.get(fieldName);
    if (!field || !field.invalid) return;

    let errorMessage = '';
    
    if (fieldName === 'author_name') {
      errorMessage = 'Inserisci un nome valido (min 2 caratteri)';
    } else if (fieldName === 'text') {
      errorMessage = 'Il commento deve contenere almeno 10 caratteri';
    } else if (fieldName === 'rating') {
      errorMessage = 'Seleziona una valutazione valida';
    }

    if (errorMessage) {
      this.error.set(errorMessage);
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
}
