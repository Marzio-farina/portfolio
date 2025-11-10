import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService, LoginDto, RegisterDto } from '../../services/auth.service';
import { OAuthService } from '../../services/oauth.service';
import { Notification as NotificationCmp, NotificationType } from '../notification/notification';
import { finalize } from 'rxjs';
import { Notification } from '../notification/notification';
import { NotificationService } from '../../services/notification.service';
import { CommonModule } from '@angular/common';

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
  imports: [ReactiveFormsModule, NotificationCmp, CommonModule],
  providers: [NotificationService],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  protected oauth = inject(OAuthService);
  protected notificationService = inject(NotificationService);

  // UI state
  mode = signal<'login' | 'register' | 'recover' | 'reset-password'>('login');
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  showLoginPass = signal(false);
  showRegPass = signal(false);
  showResetPass = signal(false);
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
    this.notificationService.clear();
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); this.showValidationErrors('login'); return; }
    this.loading.set(true);

    const dto = this.loginForm.value as LoginDto;
    this.auth.login(dto).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (res) => {
        this.success.set(`Accesso effettuato come ${res.user?.email || 'utente'}`);
        this.notificationService.clear();
      },
      error: (err) => {
        const message = this.humanizeError(err);
        this.error.set(message);
        // Aggiungi notifica per mostrare l'errore
        this.notificationService.add('error', 'Email o password errati', 'login.credentials');
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
        this.notificationService.clear();
        this.tooltipVisible.set(null);
        this.showRegPass.set(false);
        // L'utente è già autenticato (token impostato da AuthService.register)
        // La modale verrà chiusa automaticamente da App quando authed == true
      },
      error: (err) => {
        const message = this.humanizeError(err);
        this.error.set(message);
        this.notificationService.add('error', message, 'global');
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
        this.notificationService.clear();
      },
      error: (err) => {
        const message = this.humanizeError(err);
        this.error.set(message);
        this.notificationService.add('error', message, 'global');
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
        this.notificationService.clear();
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
        this.notificationService.add('error', message, 'global');
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
    if (status === 401) return 'Credenziali non valide.';
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
      this.notificationService.add(type, message, fieldKey);
    } else {
      this.notificationService.remove(fieldKey);
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

  private showValidationErrors(scope: 'login' | 'register' | 'recover' | 'reset-password') {
    if (scope === 'login') {
      if (this.loginForm.get('email')?.invalid) this.notificationService.add('error', "L'email è obbligatoria o non valida.", 'login.email');
      if (this.loginForm.get('password')?.invalid) this.notificationService.add('error', 'La password è obbligatoria.', 'login.password');
    } else if (scope === 'register') {
      if (this.registerForm.get('name')?.invalid) this.notificationService.add('warning', 'Il nome è obbligatorio (min 2 caratteri).', 'register.name');
      if (this.registerForm.get('email')?.invalid) this.notificationService.add('error', "L'email è obbligatoria o non valida.", 'register.email');
      if (this.registerForm.get('password')?.errors?.['weakPassword'] || this.registerForm.get('password')?.errors?.['required']) this.notificationService.add('warning', 'Password debole: 8+ caratteri con maiuscole, minuscole e numeri.', 'register.password');
      if (this.registerForm.errors?.['fieldMismatch']) this.notificationService.add('error', 'Le password non coincidono.', 'register.confirm');
      if (this.registerForm.get('terms')?.invalid) this.notificationService.add('error', 'Devi accettare i termini.', 'register.terms');
    } else if (scope === 'recover') {
      if (this.recoverForm.get('email')?.invalid) this.notificationService.add('error', "L'email è obbligatoria o non valida.", 'recover.email');
    } else if (scope === 'reset-password') {
      if (this.resetPasswordForm.get('email')?.invalid) this.notificationService.add('error', "L'email è obbligatoria o non valida.", 'reset-password.email');
      if (this.resetPasswordForm.get('password')?.errors?.['weakPassword'] || this.resetPasswordForm.get('password')?.errors?.['required']) this.notificationService.add('warning', 'Password debole: 8+ caratteri con maiuscole, minuscole e numeri.', 'reset-password.password');
      if (this.resetPasswordForm.errors?.['fieldMismatch']) this.notificationService.add('error', 'Le password non coincidono.', 'reset-password.confirm');
    }
  }

  getMostSevereNotification() {
    return this.notificationService.getMostSevere();
  }
}