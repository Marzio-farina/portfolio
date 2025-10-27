import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService, LoginDto, RegisterDto } from '../../services/auth.service';
import { Notification as NotificationCmp, NotificationType } from '../notification/notification';
import { finalize } from 'rxjs';
import { Notification } from '../notification/notification';

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
  imports: [ReactiveFormsModule, NotificationCmp],
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
  // Notifiche multiple (stile add-testimonial)
  notifications = signal<{ id: string; message: string; type: NotificationType; timestamp: number; fieldId: string; }[]>([]);
  tooltipVisible = signal<string | null>(null);
  
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
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); this.showValidationErrors('login'); return; }
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
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); this.showValidationErrors('register'); return; }
    this.loading.set(true);

    const { name, email, password } = this.registerForm.value as RegisterDto & { confirm: string; terms: boolean };
    this.auth.register({ name, email, password }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (res) => {
        const registeredEmail = res.user?.email || '';
        this.success.set(`Account creato per ${res.user?.name || 'utente'} (${registeredEmail}). Ora puoi accedere.`);

        // Pulisci campi registrazione e stato UI
        this.registerForm.reset({ name: '', email: '', password: '', confirm: '', terms: false });
        this.registerForm.markAsPristine();
        this.registerForm.markAsUntouched();
        this.notifications.set([]);
        this.tooltipVisible.set(null);
        this.showRegPass.set(false);

        // Passa al tab login e precompila l'email
        this.mode.set('login');
        this.loginForm.patchValue({ email: registeredEmail, password: '' });
        this.loginForm.markAsPristine();
        this.loginForm.markAsUntouched();
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

  // ===== Notifiche stile stack =====
  onFieldBlur(fieldKey: string) {
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
      case 'login.email': return this.loginForm.get('email');
      case 'login.password': return this.loginForm.get('password');
      case 'register.name': return this.registerForm.get('name');
      case 'register.email': return this.registerForm.get('email');
      case 'register.password': return this.registerForm.get('password');
      case 'register.confirm': return this.registerForm.get('confirm');
      case 'register.terms': return this.registerForm.get('terms');
      default: return null;
    }
  }

  private fieldErrorMessage(key: string): { message: string; type: NotificationType } {
    switch (key) {
      case 'login.email':
        return { message: "L'email per il login non valida.", type: 'error' };
      case 'register.email':
        return { message: "L'email per la registrazione non valida.", type: 'error' };
      case 'login.password':
        return { message: 'La password è obbligatoria.', type: 'error' };
      case 'register.name':
        return { message: 'Il nome è obbligatorio (min 2 caratteri).', type: 'warning' };
      case 'register.password':
        return { message: 'Inserisci: 8+ car. con maiuscole, minuscole e numeri.', type: 'warning' };
      case 'register.confirm':
        return { message: 'Le password non coincidono.', type: 'error' };
      case 'register.terms':
        return { message: 'Devi accettare i termini.', type: 'error' };
      default:
        return { message: 'Compila correttamente il campo.', type: 'info' };
    }
  }

  // Tooltip
  showTooltip(key: string) { this.tooltipVisible.set(key); }
  hideTooltip(key: string) { if (this.tooltipVisible() === key) this.tooltipVisible.set(null); }

  private addNotification(fieldId: string, message: string, type: NotificationType) {
    const now = Date.now();
    this.notifications.update(list => {
      const filtered = list.filter(n => n.fieldId !== fieldId);
      return [...filtered, { id: `${fieldId}-${now}`, message, type, timestamp: now, fieldId }];
    });
  }

  private removeNotification(fieldId: string) {
    this.notifications.update(list => list.filter(n => n.fieldId !== fieldId));
  }

  private showValidationErrors(scope: 'login' | 'register') {
    if (scope === 'login') {
      if (this.loginForm.get('email')?.invalid) this.addNotification('login.email', "L'email è obbligatoria o non valida.", 'error');
      if (this.loginForm.get('password')?.invalid) this.addNotification('login.password', 'La password è obbligatoria.', 'error');
    } else {
      if (this.registerForm.get('name')?.invalid) this.addNotification('register.name', 'Il nome è obbligatorio (min 2 caratteri).', 'warning');
      if (this.registerForm.get('email')?.invalid) this.addNotification('register.email', "L'email è obbligatoria o non valida.", 'error');
      if (this.registerForm.get('password')?.errors?.['weakPassword'] || this.registerForm.get('password')?.errors?.['required']) this.addNotification('register.password', 'Password debole: 8+ caratteri con maiuscole, minuscole e numeri.', 'warning');
      if (this.registerForm.errors?.['fieldMismatch']) this.addNotification('register.confirm', 'Le password non coincidono.', 'error');
      if (this.registerForm.get('terms')?.invalid) this.addNotification('register.terms', 'Devi accettare i termini.', 'error');
    }
  }

  getMostSevereNotification() {
    const list = this.notifications();
    if (!list.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }
}