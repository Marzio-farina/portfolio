import { Component, ElementRef, effect, inject, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantRouterService } from '../../services/tenant-router.service';
import { TenantService } from '../../services/tenant.service';
import { AttestatiService } from '../../services/attestati.service';
import { Notification, NotificationType } from '../notification/notification';
import { environment } from '../../../environments/environment';
import { PosterUploaderComponent, PosterData } from '../poster-uploader/poster-uploader.component';

@Component({
  selector: 'app-add-attestato',
  standalone: true,
  imports: [ReactiveFormsModule, Notification, PosterUploaderComponent],
  templateUrl: './add-attestato.html',
  styleUrls: ['./add-attestato.css']
})
export class AddAttestato {
  private fb = inject(FormBuilder);
  private attestatiService = inject(AttestatiService);
  private router = inject(Router);
  private tenantRouter = inject(TenantRouterService);
  private tenant = inject(TenantService);

  addAttestatoForm: FormGroup;
  uploading = signal(false);
  selectedPosterFile = signal<File | null>(null);
  errorMsg = signal<string | null>(null);

  notifications = signal<{ id: string; message: string; type: NotificationType; timestamp: number; fieldId: string; }[]>([]);
  // yyyy-mm-dd formattato in locale (no timezone shift)
  readonly todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  private parseLocalDate(ymd?: string | null): Date | null {
    if (!ymd) return null;
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(ymd);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = new Date(y, mo - 1, d);
    date.setHours(0, 0, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }

  constructor() {
    const notFutureDate: ValidatorFn = (control: AbstractControl) => {
      const value = control.value as string | null | undefined;
      if (!value) return null;
      const today = this.parseLocalDate(this.todayStr);
      const candidate = this.parseLocalDate(value);
      if (!today || !candidate) return null;
      return candidate.getTime() > today.getTime() ? { futureDate: true } : null;
    };

    this.addAttestatoForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', [Validators.maxLength(1000)]],
      issuer: ['', [Validators.maxLength(150)]],
      issued_at: ['', [notFutureDate]],
      expires_at: [''],
      credential_id: ['', [Validators.maxLength(100)]],
      credential_url: ['', [Validators.pattern('https?://.+'), Validators.maxLength(255)]],
      poster_file: [null, Validators.required]
    });

    effect(() => {
      const isUploading = this.uploading();
      const controls = ['title','description','issuer','issued_at','expires_at','credential_id','credential_url'];
      controls.forEach(name => {
        const ctrl = this.addAttestatoForm.get(name);
        if (!ctrl) return;
        isUploading ? ctrl.disable() : ctrl.enable();
      });
    });

    // Aggiorna errori di ordinamento date quando cambiano
    this.addAttestatoForm.get('issued_at')?.valueChanges.subscribe(() => this.updateDateOrderErrors());
    this.addAttestatoForm.get('expires_at')?.valueChanges.subscribe(() => this.updateDateOrderErrors());
  }

  private updateDateOrderErrors(): void {
    const issuedCtrl = this.addAttestatoForm.get('issued_at');
    const expiresCtrl = this.addAttestatoForm.get('expires_at');
    const issued = this.parseLocalDate(issuedCtrl?.value);
    const expires = this.parseLocalDate(expiresCtrl?.value);

    // reset specifici errori di ordine (senza toccare altri errori)
    const clearSpecific = (ctrl: any, key: string) => {
      if (!ctrl) return;
      const errs = { ...(ctrl.errors || {}) };
      if (errs[key]) { delete errs[key]; }
      ctrl.setErrors(Object.keys(errs).length ? errs : null);
    };

    clearSpecific(issuedCtrl, 'afterExpiry');
    clearSpecific(expiresCtrl, 'beforeIssued');

    if (issued && expires) {
      if (issued.getTime() > expires.getTime()) {
        // issued after expires
        issuedCtrl?.setErrors({ ...(issuedCtrl.errors || {}), afterExpiry: true });
        expiresCtrl?.setErrors({ ...(expiresCtrl.errors || {}), beforeIssued: true });
      }
    }
  }

  getIssuedMax(): string {
    const expiresStr = this.addAttestatoForm.get('expires_at')?.value as string | null | undefined;
    if (!expiresStr) return this.todayStr;
    // restituisci la min tra today e expires (stringhe yyyy-mm-dd confrontabili)
    return expiresStr < this.todayStr ? expiresStr : this.todayStr;
  }

  goBack(): void {
    // Naviga alla pagina corretta: con userSlug se presente, altrimenti /attestati
    const userSlug = this.tenant.userSlug();
    if (userSlug) {
      this.router.navigate([`/${userSlug}/attestati`]);
    } else {
      this.tenantRouter.navigate(['attestati']);
    }
  }

  /**
   * Gestisce la selezione del poster dal poster-uploader component
   */
  onPosterSelected(data: PosterData): void {
    this.selectedPosterFile.set(data.file);
    this.addAttestatoForm.patchValue({ poster_file: data.file });
    this.addAttestatoForm.get('poster_file')?.updateValueAndValidity();
    this.removeNotification('attestato.poster_file');
  }

  onSubmit(): void {
    if (this.uploading()) return;
    this.notifications.set([]);
    this.errorMsg.set(null);

    if (this.addAttestatoForm.invalid) {
      this.addAttestatoForm.markAllAsTouched();
      this.showValidationErrors();
      return;
    }

    this.uploading.set(true);

    const v = this.addAttestatoForm.getRawValue();
    const formData = new FormData();
    formData.append('title', v.title);
    
    // Includi user_id se presente (attestato specifico per utente)
    const userId = this.tenant.userId();
    if (userId) {
      formData.append('user_id', String(userId));
    }
    
    if (v.description?.trim()) formData.append('description', v.description.trim());
    if (v.issuer?.trim()) formData.append('issuer', v.issuer.trim());
    if (v.issued_at?.toString().trim()) formData.append('issued_at', v.issued_at);
    if (v.expires_at?.toString().trim()) formData.append('expires_at', v.expires_at);
    if (v.credential_id?.trim()) formData.append('credential_id', v.credential_id.trim());
    if (v.credential_url?.trim()) formData.append('credential_url', v.credential_url.trim());
    if (v.poster_file) formData.append('poster_file', v.poster_file, v.poster_file.name);

    this.attestatiService.create$(formData).subscribe({
      next: () => {
        this.uploading.set(false);
        this.notifications.set([]);
        // Naviga alla pagina corretta: con userSlug se presente, altrimenti /attestati
        const userSlug = this.tenant.userSlug();
        if (userSlug) {
          this.router.navigate([`/${userSlug}/attestati`], { queryParams: { refresh: '1', t: Date.now() } });
        } else {
          this.tenantRouter.navigate(['attestati'], { queryParams: { refresh: '1', t: Date.now() } });
        }
      },
      error: (err: any) => {
        let message = 'Errore durante la creazione dell\'attestato';
        const details: string[] = [];
        if (err?.error?.errors) {
          Object.entries(err.error.errors).forEach(([field, messages]) => {
            const list = Array.isArray(messages) ? messages : [messages];
            list.forEach(msg => details.push(`${field}: ${msg}`));
          });
        }
        if (details.length) message = details.join('; ');
        else if (err?.error?.message) message = err.error.message;

        if (!environment.production) {
          console.error('Errore creazione attestato:', err);
        }

        this.errorMsg.set(message);
        this.uploading.set(false);
        if (err?.error?.errors) {
          Object.entries(err.error.errors).forEach(([field, messages]) => {
            const list = Array.isArray(messages) ? messages : [messages];
            list.forEach(msg => {
              const fid = `attestato.${field}`;
              this.addNotification(fid, `${field}: ${msg}`, 'error');
            });
          });
        } else {
          this.notifications.update(list => [...list, { id: `global-${Date.now()}`, message, type: 'error', timestamp: Date.now(), fieldId: 'global' }]);
        }
      }
    });
  }

  onCancel(): void {
    if (!this.uploading()) {
      this.notifications.set([]);
      // Naviga alla pagina corretta: con userSlug se presente, altrimenti /attestati
      const userSlug = this.tenant.userSlug();
      if (userSlug) {
        this.router.navigate([`/${userSlug}/attestati`]);
      } else {
        this.tenantRouter.navigate(['attestati']);
      }
    }
  }

  onFieldBlur(fieldKey: string): void {
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
      case 'attestato.title': return this.addAttestatoForm.get('title');
      case 'attestato.description': return this.addAttestatoForm.get('description');
      case 'attestato.issuer': return this.addAttestatoForm.get('issuer');
      case 'attestato.issued_at': return this.addAttestatoForm.get('issued_at');
      case 'attestato.expires_at': return this.addAttestatoForm.get('expires_at');
      case 'attestato.credential_id': return this.addAttestatoForm.get('credential_id');
      case 'attestato.credential_url': return this.addAttestatoForm.get('credential_url');
      case 'attestato.poster_file': return this.addAttestatoForm.get('poster_file');
      default: return null;
    }
  }

  private fieldErrorMessage(key: string): { message: string; type: NotificationType } {
    const ctrl = this.getControlByKey(key);
    if (!ctrl || !ctrl.errors) return { message: 'Campo non valido.', type: 'error' };
    switch (key) {
      case 'attestato.title':
        if (ctrl.errors['required']) return { message: 'Il titolo è obbligatorio.', type: 'error' };
        if (ctrl.errors['maxlength']) return { message: 'Il titolo deve essere lungo massimo 150 caratteri.', type: 'error' };
        break;
      case 'attestato.description':
        if (ctrl.errors['maxlength']) return { message: 'La descrizione deve essere lunga massimo 1000 caratteri.', type: 'warning' };
        break;
      case 'attestato.issuer':
        if (ctrl.errors['maxlength']) return { message: "L'ente rilasciante deve essere lungo massimo 150 caratteri.", type: 'warning' };
        break;
      case 'attestato.issued_at':
        if (ctrl.errors['futureDate']) {
          return { message: 'La data di rilascio non può essere nel futuro.', type: 'error' };
        }
        break;
      case 'attestato.credential_id':
        if (ctrl.errors['maxlength']) return { message: "L'ID credenziale deve essere lungo massimo 100 caratteri.", type: 'warning' };
        break;
      case 'attestato.credential_url':
        if (ctrl.errors['pattern']) return { message: 'Inserisci un URL valido (es. https://...).', type: 'error' };
        if (ctrl.errors['maxlength']) return { message: "L'URL deve essere lungo massimo 255 caratteri.", type: 'warning' };
        break;
      case 'attestato.expires_at':
        if (ctrl.errors['beforeIssued']) {
          return { message: 'La data di scadenza non può essere precedente.', type: 'error' };
        }
        break;
      case 'attestato.poster_file':
        if (ctrl.errors['required']) return { message: "L'immagine dell'attestato è obbligatoria.", type: 'error' };
        break;
    }
    return { message: 'Compila correttamente il campo.', type: 'error' };
  }

  private addNotification(fieldId: string, message: string, type: NotificationType): void {
    const now = Date.now();
    this.notifications.update(list => {
      const filtered = list.filter(n => n.fieldId !== fieldId);
      return [...filtered, { id: `${fieldId}-${now}`, message, type, timestamp: now, fieldId }];
    });
  }

  private removeNotification(fieldId: string): void {
    this.notifications.update(list => list.filter(n => n.fieldId !== fieldId));
  }

  private showValidationErrors(): void {
    if (this.addAttestatoForm.get('title')?.invalid) {
      const c = this.addAttestatoForm.get('title');
      if (c?.errors?.['required']) this.addNotification('attestato.title', 'Il titolo è obbligatorio.', 'error');
      else if (c?.errors?.['maxlength']) this.addNotification('attestato.title', 'Il titolo deve essere lungo massimo 150 caratteri.', 'error');
    }
    if (this.addAttestatoForm.get('poster_file')?.invalid) {
      if (this.addAttestatoForm.get('poster_file')?.errors?.['required']) this.addNotification('attestato.poster_file', "L'immagine dell'attestato è obbligatoria.", 'error');
    }
    const desc = this.addAttestatoForm.get('description');
    if (desc?.invalid && desc.errors?.['maxlength']) this.addNotification('attestato.description', 'La descrizione deve essere lunga massimo 1000 caratteri.', 'warning');
    const issuer = this.addAttestatoForm.get('issuer');
    if (issuer?.invalid && issuer.errors?.['maxlength']) this.addNotification('attestato.issuer', "L'ente rilasciante deve essere lungo massimo 150 caratteri.", 'warning');
    const issuedAt = this.addAttestatoForm.get('issued_at');
    if (issuedAt?.invalid && issuedAt.errors?.['futureDate']) this.addNotification('attestato.issued_at', 'La data di rilascio non può essere nel futuro.', 'error');
    const credId = this.addAttestatoForm.get('credential_id');
    if (credId?.invalid && credId.errors?.['maxlength']) this.addNotification('attestato.credential_id', "L'ID credenziale deve essere lungo massimo 100 caratteri.", 'warning');
    const credUrl = this.addAttestatoForm.get('credential_url');
    if (credUrl?.invalid) {
      if (credUrl.errors?.['pattern']) this.addNotification('attestato.credential_url', 'Inserisci un URL valido (es. https://...).', 'error');
      else if (credUrl.errors?.['maxlength']) this.addNotification('attestato.credential_url', "L'URL deve essere lungo massimo 255 caratteri.", 'warning');
    }
    const expiresAt = this.addAttestatoForm.get('expires_at');
    if (expiresAt?.invalid && expiresAt.errors?.['beforeIssued']) this.addNotification('attestato.expires_at', 'La data di scadenza non può essere precedente.', 'error');
  }

  getMostSevereNotification() {
    const list = this.notifications();
    if (!list.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }
}


