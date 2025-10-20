import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

/**
* Standalone Auth component: Accedi / Registrati
* - Single file, inline template & styles
* - Reactive forms with strong validation
* - Password visibility toggle
* - Emits fake submit events (replace with real AuthService)
* - Accessible markup (labels, aria- attributes)
*/


function matchFieldsValidator(field: string, confirmField: string) {
return (group: AbstractControl): ValidationErrors | null => {
const f = group.get(field);
const c = group.get(confirmField);
if (!f || !c) return null;
const ok = f.value === c.value;
return ok ? null : { fieldMismatch: { [field]: f.value, [confirmField]: c.value } };
};
}


function strongPassword() {
// at least 8 chars, 1 upper, 1 lower, 1 number
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

  // UI state
  mode = signal<'login'|'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  showLoginPass = signal(false);
  showRegPass = signal(false);
  
  // Forms
  loginForm: FormGroup = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required]]
  });

  registerForm: FormGroup = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, strongPassword()]],
  confirm: ['', [Validators.required]],
  terms: [false, [Validators.requiredTrue]]
  }, { validators: matchFieldsValidator('password','confirm')});

  showError(form: FormGroup, control: string, errorKey: string): boolean {
  const c = form.get(control);
  return !!(c && c.touched && c.errors?.[errorKey]);
  }

  async submitLogin() {
  this.error.set(null); this.success.set(null);
  if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
  this.loading.set(true);
  try {
    // TODO: replace with real AuthService login
    await new Promise(res => setTimeout(res, 900));
    const { email } = this.loginForm.value;
    this.success.set(`Accesso effettuato come ${email}`);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Impossibile effettuare l\'accesso');
    } finally {
      this.loading.set(false);
    }
  }

  async submitRegister() {
    this.error.set(null); this.success.set(null);
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.loading.set(true);
    try {
      // TODO: replace with real AuthService register
      await new Promise(res => setTimeout(res, 1100));
      const { name, email } = this.registerForm.value;
      this.success.set(`Account creato per ${name} (${email}). Ora puoi accedere.`);
      this.mode.set('login');
      this.loginForm.patchValue({ email: this.registerForm.value.email, password: '' });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Registrazione non riuscita');
    } finally {
      this.loading.set(false);
    }
  }

  onForgotPassword() {
    // Stub: collega alla tua pagina di reset
    this.error.set(null); this.success.set('Ti abbiamo inviato le istruzioni per il reset (demo).');
  }
}