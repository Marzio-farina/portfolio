import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService, LoginDto, RegisterDto } from '../../services/auth.service';
import { finalize } from 'rxjs';

/**
 * Standalone Auth component: Accedi / Registrati
 * - Reactive forms + validazioni
 * - Password visibility toggle
 * - Logica HTTP delegata a AuthService
 * - Messaggi UI con signal
 */


function matchFieldsValidator(field: string, confirmField: string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const f = group.get(field);
    const c = group.get(confirmField);
    if (!f || !c) return null;
    return f.value === c.value ? null : { fieldMismatch: true };
  };
}


function strongPassword() {
  // Min 8, 1 maiuscola, 1 minuscola, 1 numero
  const rx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return (c: AbstractControl): ValidationErrors | null =>
    c.value && !rx.test(c.value) ? { weakPassword: true } : null;
}

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  // UI state
  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  showLoginPass = signal(false);
  showRegPass = signal(false);
  
  // Forms
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  registerForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPassword()]],
      confirm: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: matchFieldsValidator('password', 'confirm') }
  );

  // Helpers UI
  toggleLoginPass() { this.showLoginPass.set(!this.showLoginPass()); }
  toggleRegPass()   { this.showRegPass.set(!this.showRegPass()); }

  showError(form: FormGroup, control: string, errorKey: string): boolean {
    const c = form.get(control);
    return !!(c && (c.touched || c.dirty) && c.errors?.[errorKey]);
  }

  // Actions
  submitLogin() {
    this.error.set(null); this.success.set(null);
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loading.set(true);

    const dto = this.loginForm.value as LoginDto;
    this.auth.login(dto).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (res) => {
        this.success.set(`Accesso effettuato come ${res.user?.email || 'utente'}`);
      },
      error: (err) => this.error.set(this.humanizeError(err)),
    });
  }

  submitRegister() {
    this.error.set(null); this.success.set(null);
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.loading.set(true);

    const { name, email, password } = this.registerForm.value as RegisterDto & { confirm: string; terms: boolean };
    this.auth.register({ name, email, password }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (res) => {
        this.success.set(`Account creato per ${res.user?.name || 'utente'} (${res.user?.email || 'email'}). Ora puoi accedere.`);
        this.mode.set('login');
        this.loginForm.patchValue({ email: res.user?.email || '', password: '' });
      },
      error: (err) => this.error.set(this.humanizeError(err)),
    });
  }

  onForgotPassword() {
    this.error.set(null); this.success.set(null);
    const email = (this.mode() === 'login' ? this.loginForm.value.email : this.registerForm.value.email) as string | undefined;
    if (!email) { this.error.set('Inserisci la tua email per procedere.'); return; }

    this.loading.set(true);
    this.auth.forgotPassword(email).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => this.success.set('Ti abbiamo inviato le istruzioni per il reset.'),
      error: (err) => this.error.set(this.humanizeError(err)),
    });
  }

  // Mapping errori API -> messaggi UI
  private humanizeError(err: any): string {
    const msg = err?.error?.message || err?.message;
    if (!msg) return 'Si è verificato un errore. Riprova.';
    // esempi di normalizzazione
    if (/invalid credentials|401/i.test(msg)) return 'Credenziali non valide.';
    if (/email.+exists|409/i.test(msg)) return 'Email già registrata.';
    return msg;
  }
}