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
  mode = signal<'login' | 'register' | 'recover' | 'reset-password'>('login');
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  showLoginPass = signal(false);
  showRegPass = signal(false);
  showResetPass = signal(false);
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

  recoverForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  resetPasswordForm: FormGroup = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      token: ['', [Validators.required]],
      password: ['', [Validators.required, strongPassword()]],
      confirm: ['', [Validators.required]],
    },
    { validators: matchFieldsValidator('password', 'confirm') }
  );

  // Helpers UI
  toggleLoginPass() { this.showLoginPass.set(!this.showLoginPass()); }
  toggleRegPass()   { this.showRegPass.set(!this.showRegPass()); }
  toggleResetPass() { this.showResetPass.set(!this.showResetPass()); }

  showError(form: FormGroup, control: string, errorKey: string): boolean {
    const c = form.get(control);
    return !!(c && (c.touched || c.dirty) && c.errors?.[errorKey]);
  }

  // Actions
  submitLogin() {
    this.error.set(null); this.success.set(null);
    this.notifications.set([]); // Reset notifiche
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); this.showValidationErrors('login'); return; }
    this.loading.set(true);

    const dto = this.loginForm.value as LoginDto;
    this.auth.login(dto).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (res) => {
        this.success.set(`Accesso effettuato come ${res.user?.email || 'utente'}`);
        this.notifications.set([]); // Pulisci notifiche al successo
      },
      error: (err) => {
        const message = this.humanizeError(err);
        this.error.set(message);
        // Aggiungi notifica per mostrare l'errore
        this.addNotification('login.credentials', 'Email o password errati', 'error');
      },
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
        this.success.set(`Registrazione completata: accesso effettuato come ${res.user?.name || 'utente'} (${registeredEmail}).`);

        // Pulisci campi registrazione e stato UI
        this.registerForm.reset({ name: '', email: '', password: '', confirm: '', terms: false });
        this.registerForm.markAsPristine();
        this.registerForm.markAsUntouched();
        this.notifications.set([]);
        this.tooltipVisible.set(null);
        this.showRegPass.set(false);
        // L'utente è già autenticato (token impostato da AuthService.register)
        // La modale verrà chiusa automaticamente da App quando authed == true
      },
      error: (err) => {
        const message = this.humanizeError(err);
        this.error.set(message);
        this.notifications.update(list => [...list, { id: `global-${Date.now()}`, message, type: 'error', timestamp: Date.now(), fieldId: 'global' }]);
      },
    });
  }

  onForgotPassword() {
    // Precompila email se disponibile prima di cambiare mode
    const currentMode = this.mode();
    const email = (currentMode === 'login' ? this.loginForm.value.email : this.registerForm.value.email) as string | undefined;
    
    // Passa alla modalità recupera
    this.mode.set('recover');
    this.error.set(null);
    this.success.set(null);
    
    // Precompila email se disponibile
    if (email) {
      this.recoverForm.patchValue({ email });
    }
  }

  submitRecover() {
    this.error.set(null); 
    this.success.set(null);
    if (this.recoverForm.invalid) {
      this.recoverForm.markAllAsTouched();
      this.showValidationErrors('recover');
      return;
    }
    this.loading.set(true);

    const email = this.recoverForm.value.email as string;
    this.auth.forgotPassword(email).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => {
        this.success.set('Ti abbiamo inviato le istruzioni per il reset. Controlla la tua email.');
        this.recoverForm.reset();
        this.notifications.set([]);
      },
      error: (err) => {
        const message = this.humanizeError(err);
        this.error.set(message);
        this.notifications.update(list => [...list, { id: `global-${Date.now()}`, message, type: 'error', timestamp: Date.now(), fieldId: 'global' }]);
      },
    });
  }

  submitResetPassword() {
    this.error.set(null);
    this.success.set(null);
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      this.showValidationErrors('reset-password');
      return;
    }
    this.loading.set(true);

    const { email, token, password } = this.resetPasswordForm.value;
    this.auth.resetPassword(email, token, password).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => {
        this.success.set('Password reimpostata con successo! Puoi ora accedere con la nuova password.');
        this.resetPasswordForm.reset();
        this.notifications.set([]);
        // Passa al login dopo 2 secondi
        setTimeout(() => {
          this.mode.set('login');
          this.error.set(null);
          this.success.set(null);
        }, 2000);
      },
      error: (err) => {
        const message = this.humanizeError(err);
        this.error.set(message);
        this.notifications.update(list => [...list, { id: `global-${Date.now()}`, message, type: 'error', timestamp: Date.now(), fieldId: 'global' }]);
      },
    });
  }

  /**
   * Inizializza il form di reset password con token ed email dai query parameters
   */
  initializeResetPassword(email: string, token: string): void {
    this.mode.set('reset-password');
    this.resetPasswordForm.patchValue({ email, token });
    this.error.set(null);
    this.success.set(null);
  }

  // Mapping errori API -> messaggi UI
  private humanizeError(err: any): string {
    const status = err?.status ?? err?.error?.status ?? err?.originalError?.status;
    const payload = err?.payload || err?.error || err?.originalError?.error;
    const msg = payload?.message || err?.message || '';
    const errors = payload?.errors;
    if (status === 422 && errors?.email) return 'Email già registrata.';
    if (status === 409) return 'Email già registrata.';
    if (/email.+(exists|taken)/i.test(msg)) return 'Email già registrata.';
    if (/invalid credentials|401/i.test(msg)) return 'Credenziali non valide.';
    return msg || 'Si è verificato un errore. Riprova.';
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
      case 'recover.email': return this.recoverForm.get('email');
      case 'reset-password.email': return this.resetPasswordForm.get('email');
      case 'reset-password.password': return this.resetPasswordForm.get('password');
      case 'reset-password.confirm': return this.resetPasswordForm.get('confirm');
      default: return null;
    }
  }

  private fieldErrorMessage(key: string): { message: string; type: NotificationType } {
    switch (key) {
      case 'login.email':
        return { message: "L'email per il login non valida.", type: 'error' };
      case 'register.email':
        return { message: "L'email per la registrazione non valida.", type: 'error' };
      case 'recover.email':
        return { message: "L'email per il recupero non valida.", type: 'error' };
      case 'reset-password.email':
        return { message: "L'email non valida.", type: 'error' };
      case 'login.password':
        return { message: 'La password è obbligatoria.', type: 'error' };
      case 'register.name':
        return { message: 'Il nome è obbligatorio (min 2 caratteri).', type: 'warning' };
      case 'register.password':
        return { message: 'Inserisci: 8+ car. con maiuscole, minuscole e numeri.', type: 'warning' };
      case 'reset-password.password':
        return { message: 'Inserisci: 8+ car. con maiuscole, minuscole e numeri.', type: 'warning' };
      case 'register.confirm':
        return { message: 'Le password non coincidono.', type: 'error' };
      case 'reset-password.confirm':
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

  private showValidationErrors(scope: 'login' | 'register' | 'recover' | 'reset-password') {
    if (scope === 'login') {
      if (this.loginForm.get('email')?.invalid) this.addNotification('login.email', "L'email è obbligatoria o non valida.", 'error');
      if (this.loginForm.get('password')?.invalid) this.addNotification('login.password', 'La password è obbligatoria.', 'error');
    } else if (scope === 'register') {
      if (this.registerForm.get('name')?.invalid) this.addNotification('register.name', 'Il nome è obbligatorio (min 2 caratteri).', 'warning');
      if (this.registerForm.get('email')?.invalid) this.addNotification('register.email', "L'email è obbligatoria o non valida.", 'error');
      if (this.registerForm.get('password')?.errors?.['weakPassword'] || this.registerForm.get('password')?.errors?.['required']) this.addNotification('register.password', 'Password debole: 8+ caratteri con maiuscole, minuscole e numeri.', 'warning');
      if (this.registerForm.errors?.['fieldMismatch']) this.addNotification('register.confirm', 'Le password non coincidono.', 'error');
      if (this.registerForm.get('terms')?.invalid) this.addNotification('register.terms', 'Devi accettare i termini.', 'error');
    } else if (scope === 'recover') {
      if (this.recoverForm.get('email')?.invalid) this.addNotification('recover.email', "L'email è obbligatoria o non valida.", 'error');
    } else if (scope === 'reset-password') {
      if (this.resetPasswordForm.get('email')?.invalid) this.addNotification('reset-password.email', "L'email è obbligatoria o non valida.", 'error');
      if (this.resetPasswordForm.get('password')?.errors?.['weakPassword'] || this.resetPasswordForm.get('password')?.errors?.['required']) this.addNotification('reset-password.password', 'Password debole: 8+ caratteri con maiuscole, minuscole e numeri.', 'warning');
      if (this.resetPasswordForm.errors?.['fieldMismatch']) this.addNotification('reset-password.confirm', 'Le password non coincidono.', 'error');
    }
  }

  getMostSevereNotification() {
    const list = this.notifications();
    if (!list.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }
}