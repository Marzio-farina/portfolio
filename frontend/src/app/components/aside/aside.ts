import { Component, DestroyRef, Inject, PLATFORM_ID, computed, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map, startWith } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';
import { Avatar } from "../avatar/avatar";
import { AvatarEditor, AvatarSelection } from '../avatar-editor/avatar-editor';
import { AboutProfileService, PublicProfileDto, SocialLink } from '../../services/about-profile.service';
import { TenantService } from '../../services/tenant.service';
import { TenantRouterService } from '../../services/tenant-router.service';
import { ThemeService } from '../../services/theme.service';
import { EditModeService } from '../../services/edit-mode.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../core/api/api-url';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import { ProfileStoreService } from '../../services/profile-store.service';

@Component({
  selector: 'app-aside',
  standalone: true,
  templateUrl: './aside.html',
  styleUrls: ['./aside.css', './aside.responsive.css', './aside.contacts.css', './aside.skeleton.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandCollapse', [
      // quando appare
      transition(':enter', [
        style({ height: 0, opacity: 0, transform: 'translateY(-4px)' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1, transform: 'translateY(0)' })),
      ]),
      // quando scompare
      transition(':leave', [
        style({ height: '*', opacity: 1 }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
  imports: [Avatar, AvatarEditor, FormsModule],
})
export class Aside {
  private readonly LARGE_MIN = 1250;
  private readonly SMALL_MAX = 580;

  // responsive
  readonly isBrowser: boolean;
  readonly width;
  readonly viewMode;
  readonly expanded = signal(false);
  readonly showContacts;
  readonly showButton;
  readonly isSmall;
  readonly edit = inject(EditModeService);
  readonly editMode = this.edit.isEditing;
  private pendingAvatarSel = signal<AvatarSelection | null>(null);
  private saveTimer: any = null;
  
  // Valori temporanei per editing identità (non signal perché usati con ngModel)
  tempName = '';
  tempSurname = '';
  tempTitle = '';
  
  // Valori temporanei per editing contatti (non signal perché usati con ngModel)
  tempPhone = '';
  tempBirthday = '';
  tempLocation = '';
  
  // Valori temporanei per editing social
  tempSocialUrl = '';
  editingSocialProvider = signal<string | null>(null);
  private socialEditTimer: any = null;
  
  // Stati di editing per ogni campo
  editingName = signal(false);
  editingSurname = signal(false);
  editingTitle = signal(false);
  editingPhone = signal(false);
  editingBirthday = signal(false);
  editingLocation = signal(false);

   // === DATI PROFILO (API) ===
  private readonly svc = inject(AboutProfileService);
  private readonly dr  = inject(DestroyRef);
  private readonly profileStore = inject(ProfileStoreService);
  readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tenant = inject(TenantService);
  private readonly tenantRouter = inject(TenantRouterService);
  private readonly notification = inject(NotificationService);

  profile  = this.profileStore.profile;
  loading  = this.profileStore.loading;
  errorMsg = this.profileStore.error;

  reload() {
    this.svc.clearCache();
    this.profileStore.refresh();
  }

  // Helpers per UI
  fullName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return [p.name, p.surname].filter(Boolean).join(' ');
  });

  emailHref = computed(() => {
    const email = this.profile()?.email?.trim();
    return email ? `mailto:${email}` : null;
  });

  phoneHref = computed(() => {
    const raw = this.profile()?.phone?.replace(/\s+/g, '');
    return raw ? `tel:${raw}` : null;
  });

  whatsappHref = computed(() => {
    const raw = this.profile()?.phone?.replace(/\D+/g, '');
    return raw ? `https://wa.me/${raw}` : null;
  });

  birthdayHuman = computed(() => this.profile()?.date_of_birth_it ?? null);
  birthdayISO   = computed(() => this.profile()?.date_of_birth ?? null);
  locationTxt   = computed(() => this.profile()?.location ?? null);

  // Social dinamici (solo configurati)
  socials = computed<SocialLink[]>(() =>
    (this.profile()?.socials ?? []).filter((s: SocialLink) => !!s.url)
  );
  
  // Lista completa social per edit mode (include quelli mancanti)
  allPossibleSocials = ['facebook', 'instagram', 'github', 'linkedin', 'x', 'youtube'] as const;
  
  // Social per edit mode: include quelli configurati + segnaposto per quelli mancanti
  socialsForEdit = computed<Array<SocialLink & { isEmpty?: boolean }>>(() => {
    if (!this.editMode()) {
      return this.socials(); // In modalità normale, solo configurati
    }
    
    const configured = this.profile()?.socials ?? [];
    const result: Array<SocialLink & { isEmpty?: boolean }> = [];
    
    // Aggiungi tutti i social possibili
    this.allPossibleSocials.forEach(provider => {
      const existing = configured.find(s => s.provider === provider);
      if (existing && existing.url) {
        // Social configurato
        result.push(existing);
      } else {
        // Social mancante → segnaposto
        result.push({
          provider: provider,
          handle: null,
          url: null,
          isEmpty: true
        });
      }
    });
    
    return result;
  });

  mainAvatarData = computed(() => {
    const p = this.profile();
    if (!p || !p.avatar_url) return null;

    return {
      id: 0,
      img: this.normalizeAvatarUrl(p.avatar_url),
      alt: this.fullName() || 'Avatar'
    };
  });

  // Stato autenticazione per mostrare icona matita
  // L'utente può modificare solo il proprio profilo
  // Verifica che sia autenticato E che corrisponda al tenant corrente
  isAuthed = computed(() => {
    // Deve essere autenticato
    if (!this.auth.isAuthenticated()) {
      return false;
    }
    
    // Se non c'è uno slug nel tenant, l'autenticazione è valida (path generico)
    const tenantUserId = this.tenant.userId();
    if (!tenantUserId) {
      return true; // Autenticazione valida su path senza slug
    }
    
    // Verifica che l'utente autenticato corrisponda al tenant corrente
    const authUserId = this.auth.authenticatedUserId();
    return authUserId !== null && authUserId === tenantUserId;
  });

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.width = this.isBrowser
      ? toSignal(
          fromEvent(window, 'resize').pipe(
            startWith(null),
            map(() => window.innerWidth)
          ),
          { initialValue: window.innerWidth }
        )
      : signal<number>(1280);

    this.viewMode = computed<'small' | 'medium' | 'large'>(() => {
      const w = this.width();
      if (w >= this.LARGE_MIN) return 'large';
      if (w < this.SMALL_MAX) return 'small';
      return 'medium';
    });

    effect(() => {
      this.expanded.set(this.viewMode() === 'large');
    });

    this.showContacts = computed(() => this.viewMode() === 'large' || this.expanded());
    this.showButton   = computed(() => this.viewMode() !== 'large');
    this.isSmall      = computed(() => this.viewMode() === 'small');

    // Salvataggio su chiusura/refresh pagina
    if (this.isBrowser) {
      const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        this.flushPendingSelection(true);
      };
      window.addEventListener('beforeunload', beforeUnloadHandler);
      this.dr.onDestroy(() => window.removeEventListener('beforeunload', beforeUnloadHandler));
    }
  }

  toggleContacts(event?: Event) {
    if (this.viewMode() !== 'large') this.expanded.update(v => !v);
    // Rimuovi il focus dal pulsante dopo il click
    if (event?.target instanceof HTMLElement) {
      (event.target as HTMLElement).blur();
    }
  }

  // Naviga alla pagina Contatti nella section
  goToContacts() {
    // Usa TenantRouterService per mantenere lo slug nell'URL
    this.tenantRouter.navigate(['contatti']);
  }

  // Naviga alla pagina Gestione Offerte Lavorative (solo per utenti autenticati)
  goToJobOffers() {
    // Chiudi l'aside se non siamo in modalità large
    if (this.viewMode() !== 'large') {
      this.expanded.set(false);
    }
    // Usa TenantRouterService per mantenere lo slug nell'URL
    this.tenantRouter.navigate(['job-offers']);
  }

  // Click su icona matita avatar
  onEditAvatar() {
    // Qui potrai aprire una modale di upload avatar
  }

  // Toggle modalità modifica
  toggleEditMode() {
    const wasEditing = this.editMode();
    this.edit.toggle();
    // Se stiamo uscendo dalla modalità modifica e c'è una selezione, salvala ora
    if (wasEditing) {
      const sel = this.pendingAvatarSel();
      if (sel) {
        this.saveAvatarSelection(sel);
        this.pendingAvatarSel.set(null);
      }
    }
  }
  
  // ========================================
  // EDITING IDENTITÀ (NOME E COGNOME)
  // ========================================
  
  startEditName(): void {
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    this.tempName = currentProfile.name || '';
    this.editingName.set(true);
    
    // Focus automatico sull'input dopo rendering
    setTimeout(() => {
      const input = document.querySelector('input[name="tempName"]') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }
  
  startEditSurname(): void {
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    this.tempSurname = currentProfile.surname || '';
    this.editingSurname.set(true);
    
    // Focus automatico sull'input dopo rendering
    setTimeout(() => {
      const input = document.querySelector('input[name="tempSurname"]') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }
  
  saveName(): void {
    // Previeni salvataggi duplicati
    if (!this.editingName()) {
      return;
    }
    
    const name = this.tempName.trim();
    
    // Validazione: il nome è obbligatorio
    if (!name) {
      this.editingName.set(false);
      this.notification.add('error', 'Il nome è obbligatorio', 'name-validation', false);
      return;
    }
    
    // Salva valore precedente per rollback
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousName = currentProfile.name;
    
    // Se il valore non è cambiato, esci
    if (name === previousName) {
      this.editingName.set(false);
      this.tempName = '';
      return;
    }
    
    // Chiudi editing PRIMA dell'optimistic update per evitare doppi trigger
    this.editingName.set(false);
    
    // 🚀 OPTIMISTIC UPDATE: Aggiorna immediatamente l'interfaccia
    this.profile.set({ ...currentProfile, name });
    this.tempName = '';
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { name }).pipe(take(1)).subscribe({
      next: () => {
        this.notification.add('success', 'Nome aggiornato', 'name-save', false);
        // Invalida cache per ricaricare i dati
        this.svc.clearCache();
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, name: previousName });
        }
        // Mostra notifica di errore
        this.notification.add('error', 'Errore durante il salvataggio del nome', 'name-save', false);
      }
    });
  }
  
  saveSurname(): void {
    // Previeni salvataggi duplicati
    if (!this.editingSurname()) {
      return;
    }
    
    const surname = this.tempSurname.trim() || null;
    
    // Salva valore precedente per rollback
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousSurname = currentProfile.surname;
    
    // Se il valore non è cambiato, esci
    if (surname === previousSurname) {
      this.editingSurname.set(false);
      this.tempSurname = '';
      return;
    }
    
    // Chiudi editing PRIMA dell'optimistic update per evitare doppi trigger
    this.editingSurname.set(false);
    
    // 🚀 OPTIMISTIC UPDATE: Aggiorna immediatamente l'interfaccia
    this.profile.set({ ...currentProfile, surname });
    this.tempSurname = '';
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { surname }).pipe(take(1)).subscribe({
      next: () => {
        this.notification.add('success', 'Cognome aggiornato', 'surname-save', false);
        // Invalida cache per ricaricare i dati
        this.svc.clearCache();
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, surname: previousSurname });
        }
        // Mostra notifica di errore
        this.notification.add('error', 'Errore durante il salvataggio del cognome', 'surname-save', false);
      }
    });
  }
  
  clearSurname(event: Event): void {
    event.stopPropagation();
    
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousSurname = currentProfile.surname;
    
    // 🚀 OPTIMISTIC UPDATE: Rimuovi immediatamente
    this.profile.set({ ...currentProfile, surname: null });
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { surname: null }).pipe(take(1)).subscribe({
      next: () => {
        this.notification.add('success', 'Cognome rimosso', 'surname-clear', false);
        // Invalida cache per ricaricare i dati
        this.svc.clearCache();
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, surname: previousSurname });
        }
        this.notification.add('error', 'Errore durante la rimozione del cognome', 'surname-clear', false);
      }
    });
  }
  
  // ========================================
  // EDITING TITLE (RUOLO/TITOLO PROFESSIONALE)
  // ========================================
  
  startEditTitle(): void {
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    this.tempTitle = currentProfile.title || '';
    this.editingTitle.set(true);
    
    // Focus automatico sull'input dopo rendering
    setTimeout(() => {
      const input = document.querySelector('input[name="tempTitle"]') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }
  
  saveTitle(): void {
    // Previeni salvataggi duplicati
    if (!this.editingTitle()) {
      return;
    }
    
    const title = this.tempTitle.trim() || null;
    
    // Salva valore precedente per rollback
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousTitle = currentProfile.title;
    
    // Se il valore non è cambiato, esci
    if (title === previousTitle) {
      this.editingTitle.set(false);
      this.tempTitle = '';
      return;
    }
    
    // Chiudi editing PRIMA dell'optimistic update per evitare doppi trigger
    this.editingTitle.set(false);
    
    // 🚀 OPTIMISTIC UPDATE: Aggiorna immediatamente l'interfaccia
    this.profile.set({ ...currentProfile, title });
    this.tempTitle = '';
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { title }).pipe(take(1)).subscribe({
      next: () => {
        this.notification.add('success', 'Titolo aggiornato', 'title-save', false);
        // Invalida cache per ricaricare i dati
        this.svc.clearCache();
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, title: previousTitle });
        }
        // Mostra notifica di errore
        this.notification.add('error', 'Errore durante il salvataggio del titolo', 'title-save', false);
      }
    });
  }
  
  clearTitle(event: Event): void {
    event.stopPropagation();
    
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousTitle = currentProfile.title;
    
    // 🚀 OPTIMISTIC UPDATE: Rimuovi immediatamente
    this.profile.set({ ...currentProfile, title: null });
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { title: null }).pipe(take(1)).subscribe({
      next: () => {
        this.notification.add('success', 'Titolo rimosso', 'title-clear', false);
        // Invalida cache per ricaricare i dati
        this.svc.clearCache();
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, title: previousTitle });
        }
        this.notification.add('error', 'Errore durante la rimozione del titolo', 'title-clear', false);
      }
    });
  }
  
  // ========================================
  // EDITING SOCIAL LINKS
  // ========================================
  
  /**
   * Valida un URL verificando che sia ben formato e abbia un protocollo valido
   */
  private isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      // Accetta solo http e https
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      // Se new URL() lancia un errore, l'URL non è valido
      return false;
    }
  }
  
  /**
   * Valida un numero di telefono
   * Accetta formati internazionali con prefisso opzionale (+39, +1, etc.)
   * Supporta spazi, trattini e parentesi come separatori
   * Lunghezza: 8-20 caratteri (escluso prefisso e separatori)
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Pattern: prefisso opzionale +, poi cifre con separatori opzionali (spazi, trattini, parentesi)
    const phonePattern = /^\+?[0-9\s\-()]{8,20}$/;
    
    if (!phonePattern.test(phone)) {
      return false;
    }
    
    // Conta solo le cifre (escludendo separatori)
    const digitsOnly = phone.replace(/[^\d]/g, '');
    
    // Deve avere almeno 8 cifre e massimo 15 (standard internazionale)
    return digitsOnly.length >= 8 && digitsOnly.length <= 15;
  }
  
  startAddSocial(event: Event, provider: string, currentUrl?: string | null): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Cancella timer precedente se esiste
    if (this.socialEditTimer) {
      clearTimeout(this.socialEditTimer);
      this.socialEditTimer = null;
    }
    
    // Pre-compila con URL esistente se presente (per editing)
    this.tempSocialUrl = currentUrl || '';
    this.editingSocialProvider.set(provider);
    
    // Focus automatico sull'input dopo rendering
    setTimeout(() => {
      const input = document.querySelector(`input[name="socialUrl-${provider}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        // Posiziona il cursore alla fine del testo
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 50);
    
    // Timer: chiude automaticamente dopo 5 secondi se non viene inserito nulla
    // Solo per social nuovi (non per editing)
    if (!currentUrl) {
      this.socialEditTimer = setTimeout(() => {
        if (this.editingSocialProvider() === provider && !this.tempSocialUrl.trim()) {
          this.editingSocialProvider.set(null);
          this.tempSocialUrl = '';
        }
        this.socialEditTimer = null;
      }, 5000);
    }
  }
  
  handleSocialClick(event: Event, social: SocialLink & { isEmpty?: boolean }): void {
    if (this.editMode()) {
      // In modalità edit, qualsiasi click apre l'input (aggiunta o modifica)
      this.startAddSocial(event, social.provider, social.url);
    } else if (social.isEmpty) {
      // Non in edit mode, ma social vuoto → previeni navigazione
      event.preventDefault();
    }
    // Altrimenti (non edit mode e social configurato) → lascia che il link funzioni normalmente
  }
  
  saveSocial(provider: string): void {
    // Cancella timer quando l'utente interagisce
    if (this.socialEditTimer) {
      clearTimeout(this.socialEditTimer);
      this.socialEditTimer = null;
    }
    
    // Previeni salvataggi duplicati
    if (this.editingSocialProvider() !== provider) {
      return;
    }
    
    const url = this.tempSocialUrl.trim();
    if (!url) {
      // Se vuoto, chiudi senza salvare
      this.editingSocialProvider.set(null);
      this.tempSocialUrl = '';
      return;
    }
    
    // ✅ VALIDAZIONE URL lato frontend
    if (!this.isValidUrl(url)) {
      this.notification.add('error', 'URL non valido. Inserisci (es. https://example.com)', 'social-url-invalid', false);
      return; // Non chiudere l'input, permetti correzione
    }
    
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousSocials = currentProfile.socials;
    
    // Chiudi editing PRIMA dell'optimistic update
    this.editingSocialProvider.set(null);
    this.tempSocialUrl = '';
    
    // 🚀 OPTIMISTIC UPDATE: Aggiungi/Aggiorna il social nell'array
    const existingIndex = currentProfile.socials.findIndex(s => s.provider === provider);
    let updatedSocials;
    
    if (existingIndex >= 0) {
      // Aggiorna esistente
      updatedSocials = [...currentProfile.socials];
      updatedSocials[existingIndex] = { ...updatedSocials[existingIndex], url, handle: provider };
    } else {
      // Aggiungi nuovo
      updatedSocials = [...currentProfile.socials, { provider, url, handle: provider }];
    }
    
    this.profile.set({ ...currentProfile, socials: updatedSocials });
    
    const apiUrlPath = apiUrl('social-accounts');
    
    // Invia richiesta al backend
    this.http.post(apiUrlPath, { provider, url, handle: provider }).pipe(take(1)).subscribe({
      next: () => {
        this.notification.add('success', `${provider} aggiunto`, 'social-save', false);
        // Invalida cache per ricaricare i dati
        this.svc.clearCache();
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina array precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, socials: previousSocials });
        }
        this.notification.add('error', `Errore durante l'aggiunta di ${provider}`, 'social-save', false);
      }
    });
  }
  
  cancelAddSocial(): void {
    // Cancella timer se esiste
    if (this.socialEditTimer) {
      clearTimeout(this.socialEditTimer);
      this.socialEditTimer = null;
    }
    
    this.editingSocialProvider.set(null);
    this.tempSocialUrl = '';
  }
  
  deleteSocial(event: Event, provider: string): void {
    event.stopPropagation();
    event.preventDefault();
    
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    // Salva l'array precedente per rollback
    const previousSocials = currentProfile.socials;
    
    // 🚀 OPTIMISTIC UPDATE: Rimuovi immediatamente il social dall'array
    const updatedSocials = currentProfile.socials.filter(s => s.provider !== provider);
    this.profile.set({ ...currentProfile, socials: updatedSocials });
    
    const url = apiUrl(`social-accounts/${provider}`);
    
    // Invia richiesta al backend
    this.http.delete(url).pipe(take(1)).subscribe({
      next: () => {
        this.notification.add('success', `${provider} rimosso`, 'social-delete', false);
        // Invalida cache per ricaricare i dati
        this.svc.clearCache();
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina array precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, socials: previousSocials });
        }
        this.notification.add('error', `Errore durante la rimozione di ${provider}`, 'social-delete', false);
      }
    });
  }
  
  // ========================================
  // EDITING CONTATTI
  // ========================================
  
  // Attiva editing per phone
  startEditPhone(): void {
    this.tempPhone = this.profile()?.phone || '';
    this.editingPhone.set(true);
    // Focus sull'input dopo il render
    setTimeout(() => {
      const input = document.querySelector('.contact__input[type="tel"]') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }
  
  // Attiva editing per birthday
  startEditBirthday(): void {
    this.tempBirthday = this.profile()?.date_of_birth || '';
    this.editingBirthday.set(true);
    setTimeout(() => {
      const input = document.querySelector('.contact__input[type="date"]') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }
  
  // Attiva editing per location
  startEditLocation(): void {
    this.tempLocation = this.profile()?.location || '';
    this.editingLocation.set(true);
    setTimeout(() => {
      const input = document.querySelector('.contact__input[type="text"]') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }
  
  // Gestisce click su location (edit or navigate)
  handleLocationClick(): void {
    if (this.editMode() && this.locationTxt() && !this.editingLocation()) {
      this.startEditLocation();
    } else if (!this.editMode() && this.locationTxt()) {
      this.goToContacts();
    }
  }
  
  // Annulla editing phone (ESC)
  cancelEditPhone(): void {
    this.editingPhone.set(false);
    this.tempPhone = '';
  }
  
  // Annulla editing birthday (ESC)
  cancelEditBirthday(): void {
    this.editingBirthday.set(false);
    this.tempBirthday = '';
  }
  
  // Annulla editing location (ESC)
  cancelEditLocation(): void {
    this.editingLocation.set(false);
    this.tempLocation = '';
  }
  
  // Cancella numero di telefono (con optimistic update)
  clearPhone(event: Event): void {
    event.stopPropagation(); // Evita trigger del click sul parent
    
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousPhone = currentProfile.phone;
    
    // 🚀 OPTIMISTIC UPDATE: Rimuovi immediatamente
    this.profile.set({ ...currentProfile, phone: null });
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { phone: null }).pipe(take(1)).subscribe({
      next: () => {
        // Il valore è già aggiornato
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, phone: previousPhone });
        }
        this.notification.add('error', 'Errore durante la rimozione del telefono', 'phone-clear', false);
      }
    });
  }
  
  // Cancella data di nascita (con optimistic update)
  clearBirthday(event: Event): void {
    event.stopPropagation();
    
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousBirthday = currentProfile.date_of_birth;
    const previousBirthdayIt = currentProfile.date_of_birth_it;
    
    // 🚀 OPTIMISTIC UPDATE: Rimuovi immediatamente
    this.profile.set({ 
      ...currentProfile, 
      date_of_birth: null,
      date_of_birth_it: null
    });
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { date_of_birth: null }).pipe(take(1)).subscribe({
      next: () => {
        // Il valore è già aggiornato
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valori precedenti
        const current = this.profile();
        if (current) {
          this.profile.set({ 
            ...current, 
            date_of_birth: previousBirthday,
            date_of_birth_it: previousBirthdayIt
          });
        }
        this.notification.add('error', 'Errore durante la rimozione del compleanno', 'birthday-clear', false);
      }
    });
  }
  
  // Cancella località (con optimistic update)
  clearLocation(event: Event): void {
    event.stopPropagation();
    
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousLocation = currentProfile.location;
    
    // 🚀 OPTIMISTIC UPDATE: Rimuovi immediatamente
    this.profile.set({ ...currentProfile, location: null });
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { location: null }).pipe(take(1)).subscribe({
      next: () => {
        // Il valore è già aggiornato
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, location: previousLocation });
        }
        this.notification.add('error', 'Errore durante la rimozione della località', 'location-clear', false);
      }
    });
  }
  
  // Salva numero di telefono (con optimistic update)
  savePhone(): void {
    const phone = this.tempPhone.trim();
    
    if (!phone) {
      this.editingPhone.set(false);
      return;
    }
    
    // ✅ VALIDAZIONE: Verifica che sia un numero di telefono valido
    if (!this.isValidPhoneNumber(phone)) {
      this.notification.add('error', 'Numero di telefono non valido', 'phone-validation', false);
      return; // Non chiudere l'input, permetti correzione
    }
    
    // Salva valore precedente per rollback
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousPhone = currentProfile.phone;
    
    // Chiudi editing PRIMA dell'optimistic update per evitare doppi trigger
    this.editingPhone.set(false);
    
    // 🚀 OPTIMISTIC UPDATE: Aggiorna immediatamente l'interfaccia
    this.profile.set({ ...currentProfile, phone });
    this.tempPhone = '';
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { phone }).pipe(take(1)).subscribe({
      next: () => {
        // Il valore è già aggiornato, nessuna azione necessaria
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, phone: previousPhone });
        }
        // Mostra notifica di errore
        this.notification.add('error', 'Errore durante il salvataggio del numero di telefono', 'phone-save', false);
      }
    });
  }
  
  // Salva data di nascita (con optimistic update)
  saveBirthday(): void {
    const birthday = this.tempBirthday.trim();
    
    if (!birthday) {
      this.editingBirthday.set(false);
      return;
    }
    
    // Validazione frontend: la data deve essere almeno 8 anni fa
    const birthDate = new Date(birthday);
    const today = new Date();
    const eightYearsAgo = new Date(today.getFullYear() - 8, today.getMonth(), today.getDate());
    
    if (birthDate > eightYearsAgo) {
      this.editingBirthday.set(false);
      this.notification.add('error', 'Inserisci una data giusta', 'birthday-validation', false);
      return;
    }
    
    // Salva valori precedenti per rollback
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousBirthday = currentProfile.date_of_birth;
    const previousBirthdayIt = currentProfile.date_of_birth_it;
    
    // Formatta la data in formato italiano (dd/mm/yyyy)
    const [year, month, day] = birthday.split('-');
    const dateIt = `${day}/${month}/${year}`;
    
    // Chiudi editing PRIMA dell'optimistic update per evitare doppi trigger
    this.editingBirthday.set(false);
    
    // 🚀 OPTIMISTIC UPDATE: Aggiorna immediatamente l'interfaccia
    this.profile.set({ 
      ...currentProfile, 
      date_of_birth: birthday,
      date_of_birth_it: dateIt
    });
    this.tempBirthday = '';
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { date_of_birth: birthday }).pipe(take(1)).subscribe({
      next: () => {
        // Il valore è già aggiornato, nessuna azione necessaria
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valori precedenti
        const current = this.profile();
        if (current) {
          this.profile.set({ 
            ...current, 
            date_of_birth: previousBirthday,
            date_of_birth_it: previousBirthdayIt
          });
        }
        // Mostra notifica con messaggio specifico dal backend se disponibile
        const errorMsg = err?.error?.message || 'Errore durante il salvataggio della data di nascita';
        this.notification.add('error', errorMsg, 'birthday-save', false);
      }
    });
  }
  
  // Salva località (con optimistic update)
  saveLocation(): void {
    const location = this.tempLocation.trim();
    
    if (!location) {
      this.editingLocation.set(false);
      return;
    }
    
    // Salva valore precedente per rollback
    const currentProfile = this.profile();
    if (!currentProfile) return;
    
    const previousLocation = currentProfile.location;
    
    // Chiudi editing PRIMA dell'optimistic update per evitare doppi trigger
    this.editingLocation.set(false);
    
    // 🚀 OPTIMISTIC UPDATE: Aggiorna immediatamente l'interfaccia
    this.profile.set({ ...currentProfile, location });
    this.tempLocation = '';
    
    const url = apiUrl('profile');
    
    // Invia richiesta al backend
    this.http.put(url, { location }).pipe(take(1)).subscribe({
      next: () => {
        // Il valore è già aggiornato, nessuna azione necessaria
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina valore precedente
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, location: previousLocation });
        }
        // Mostra notifica di errore
        this.notification.add('error', 'Errore durante il salvataggio della località', 'location-save', false);
      }
    });
  }

  // Handler cambio avatar dall'editor
  onAvatarEditorChange(sel: AvatarSelection) {
    // Non fare chiamate API ad ogni click: memorizza e salva solo all'uscita da Modifica
    this.pendingAvatarSel.set(sel);
    
    // Aggiorna immediatamente il profilo locale per visualizzazione istantanea
    const currentProfile = this.profile();
    if (currentProfile && sel.url) {
      // Aggiorna l'avatar locale per feedback visivo immediato
      this.profile.set({ ...currentProfile, avatar_url: sel.url });
    }
    
    this.scheduleAutoSave();
  }

  private scheduleAutoSave() {
    if (!this.isBrowser) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const sel = this.pendingAvatarSel();
      if (sel) this.saveAvatarSelection(sel);
      this.pendingAvatarSel.set(null);
      this.saveTimer = null;
    }, 5000);
  }

  private updateProfileAvatar(url: string | null, iconId?: number | null) {
    const token = this.auth.token();
    const headers = token ? { Authorization: `Bearer ${token}` } as any : {};
    const body: any = {};
    if (typeof iconId !== 'undefined') body.icon_id = iconId;
    if (typeof url !== 'undefined') body.avatar_url = url;
    
    this.http.put<any>(apiUrl('profile'), body, { headers })
      .subscribe({
        next: () => {
          // Non fare reload: il profilo è già stato aggiornato ottimisticamente
          // Il reload sovrascrive l'aggiornamento locale e causa il ritorno all'avatar vecchio
          // L'aggiornamento locale rimane sincronizzato e verrà confermato al prossimo reload naturale
        },
        error: () => {
          // In caso di errore, ricarica per sincronizzare con il server
          this.reload();
        }
      });
  }

  private saveAvatarSelection(sel: AvatarSelection) {
    // Priorità: file caricato -> upload, poi salva URL; altrimenti salva URL/Icona default
    if (sel.file) {
      const form = new FormData();
      form.append('avatar', sel.file);
      this.http.post<{icon:{id:number,img:string,alt:string}}>(apiUrl('avatars/upload'), form)
        .subscribe({
          next: (res) => {
            const id = res?.icon?.id;
            const iconUrl = res?.icon?.img;
            if (typeof id === 'number') {
              // Aggiorna immediatamente il profilo locale con l'URL dell'icona caricata
              const currentProfile = this.profile();
              if (currentProfile && iconUrl) {
                this.profile.set({ ...currentProfile, avatar_url: this.normalizeAvatarUrl(iconUrl) });
              }
              this.updateProfileAvatar(null, id);
            }
          }
        });
      return;
    }
    // Icona di default selezionata: salva icon_id e pulisci avatar_url
    if (typeof sel.iconId === 'number') {
      // Aggiorna immediatamente il profilo locale con l'URL dell'icona selezionata
      if (sel.url) {
        const currentProfile = this.profile();
        if (currentProfile) {
          this.profile.set({ ...currentProfile, avatar_url: this.normalizeAvatarUrl(sel.url) });
        }
      }
      this.updateProfileAvatar(null, sel.iconId);
      return;
    }
    // Fallback URL
    const url = sel.url ?? null;
    if (url) {
      this.updateProfileAvatar(url, null);
    }
  }

  private flushPendingSelection(keepalive: boolean) {
    const sel = this.pendingAvatarSel();
    if (!sel) return;
    // Caricamenti file non gestibili affidabilmente su unload: salva solo icon_id/url
    if (keepalive) {
      const token = this.auth.token();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const body: any = {};
      if (typeof sel.iconId === 'number') body.icon_id = sel.iconId;
      else if (sel.url) body.avatar_url = sel.url;
      if (Object.keys(body).length > 0) {
        try {
          fetch(apiUrl('profile'), {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
            keepalive: true,
          });
        } catch {}
      }
    } else {
      this.saveAvatarSelection(sel);
    }
    this.pendingAvatarSel.set(null);
  }

  // per scegliere l'icona in base al provider
  iconKind(provider: string): 'facebook'|'instagram'|'github'|'linkedin'|'x'|'youtube'|'globe' {
    const p = provider.toLowerCase();
    if (['facebook','instagram','github','linkedin','x','twitter','youtube'].includes(p)) {
      if (p === 'twitter') return 'x';
      return p as any;
    }
    return 'globe';
  }

  // === TEMA ===
  toggleTheme(event?: Event) {
    this.theme.toggleTheme();
    // Rimuovi il focus dal pulsante dopo il click
    if (event?.target instanceof HTMLElement) {
      (event.target as HTMLElement).blur();
    }
  }

  getThemeIcon() {
    return this.theme.isDark() ? 'moon' : 'sun';
  }

  /**
   * Normalizza gli URL degli avatar per usare il backend
   */
  private normalizeAvatarUrl(url: string): string {
    if (!url) return url;
    
    // Se è già un URL assoluto (https:// o http://), lo mantiene così com'è
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Se inizia con storage/, costruisce l'URL del backend SENZA /api/
    if (url.startsWith('storage/')) {
      const apiUrl = this.getApiBaseUrl();
      return `${apiUrl}/${url}`;
    }
    
    // Se è relativo, aggiunge il path al backend
    const apiUrl = this.getApiBaseUrl();
    return `${apiUrl}/${url}`;
  }

  /**
   * Ottiene l'URL base dell'API
   */
  private getApiBaseUrl(): string {
    // In produzione usa l'API reale, in locale usa localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    return 'https://api.marziofarina.it';
  }
}