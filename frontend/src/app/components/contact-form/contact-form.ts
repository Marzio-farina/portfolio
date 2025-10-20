import { Component, inject } from '@angular/core';
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

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    subject: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
    consent: [false, [Validators.requiredTrue]],
    website: ['']
  });

  submit() {
    this.error = undefined;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.form.value.website) return;

    this.sending = true;
    this.api.send(this.form.value as any).subscribe({
      next: () => { this.sent = true; this.sending = false; this.form.reset(); },
      error: (err) => {
        this.error = err?.error?.message ?? 'Invio non riuscito. Riprova.';
        this.sending = false;
      }
    });
  }
}