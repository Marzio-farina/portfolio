import { Component, DestroyRef, Inject, PLATFORM_ID, computed, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map, startWith, switchMap, of, Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { Avatar } from "../avatar/avatar";
import { AvatarEditor, AvatarSelection } from '../avatar-editor/avatar-editor';
import { AboutProfileService, PublicProfileDto, SocialLink } from '../../services/about-profile.service'
import { TenantService } from '../../services/tenant.service';
import { ThemeService } from '../../services/theme.service';
import { EditModeService } from '../../services/edit-mode.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../core/api/api-url';
import { Router } from '@angular/router';

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
  imports: [Avatar, AvatarEditor],
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

   // === DATI PROFILO (API) ===
  private readonly svc = inject(AboutProfileService);
  private readonly dr  = inject(DestroyRef);
  readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tenant = inject(TenantService);

  // Gestione manuale caricamento profilo (senza helper)
  private lastProfileKey: string | null = null;
  private sub: Subscription | null = null;
  private inFlight = false;

  profile  = signal<PublicProfileDto | null>(null);
  loading  = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  reload() {
    if (this.inFlight) return;
    this.sub?.unsubscribe();
    this.loading.set(true);
    this.errorMsg.set(null);
    this.inFlight = true;
    this.sub = this.getProfile$().subscribe({
      next: (res) => { this.profile.set(res); this.loading.set(false); this.inFlight = false; },
      error: (err) => {
        if (err?.status === 0 || err?.name === 'CanceledError') { this.loading.set(false); this.inFlight = false; return; }
        this.errorMsg.set(err?.message ?? 'Errore di rete'); this.loading.set(false); this.inFlight = false;
      }
    });
    this.dr.onDestroy(() => this.sub?.unsubscribe());
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

  // Social dinamici
  socials = computed<SocialLink[]>(() =>
    (this.profile()?.socials ?? []).filter((s: SocialLink) => !!s.url)
  );

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
  isAuthed = computed(() => !!this.auth.token());

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

    // Avvia il load solo quando cambia la chiave profilo (slug o root)
    effect(() => {
      const slug = this.tenant.userSlug();
      const segments = this.router.url.split('/').filter(Boolean);
      const first = segments[0] || '';
      const reserved = new Set(['about','curriculum','progetti','attestati','contatti']);
      const isTenantPath = first && !reserved.has(first);
      const key = slug ? `s:${slug}` : (isTenantPath ? `s:${first}` : 'root');
      if (this.lastProfileKey !== key) {
        this.lastProfileKey = key;
        this.reload();
      }
    });

    // Salvataggio su chiusura/refresh pagina
    if (this.isBrowser) {
      const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        this.flushPendingSelection(true);
      };
      window.addEventListener('beforeunload', beforeUnloadHandler);
      this.dr.onDestroy(() => window.removeEventListener('beforeunload', beforeUnloadHandler));
    }
  }

  private getProfile$() {
    // 1) Prova a leggere lo slug direttamente dalla URL del browser (più affidabile all'avvio)
    if (this.isBrowser) {
      const path = window.location.pathname || '';
      const segs = path.split('/').filter(Boolean);
      const firstSeg = segs[0] || '';
      const reserved = new Set(['about','curriculum','progetti','attestati','contatti']);
      if (firstSeg && !reserved.has(firstSeg)) {
        return this.svc.getBySlug(firstSeg);
      }
    }
    // 2) Altrimenti usa lo slug dal TenantService se già disponibile
    const slug = this.tenant.userSlug();
    if (slug) return this.svc.getBySlug(slug);
    // Root senza slug: profilo principale
    return this.svc.get$();
  }

  toggleContacts() {
    if (this.viewMode() !== 'large') this.expanded.update(v => !v);
  }

  // Naviga alla pagina Contatti nella section
  goToContacts() {
    this.router.navigate(['/contatti']);
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

  // Handler cambio avatar dall'editor
  onAvatarEditorChange(sel: AvatarSelection) {
    // Non fare chiamate API ad ogni click: memorizza e salva solo all'uscita da Modifica
    this.pendingAvatarSel.set(sel);
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
    this.http.put(apiUrl('profile'), body, { headers })
      .subscribe(() => {
        // ricarica i dati dell'aside
        this.reload();
      });
  }

  private saveAvatarSelection(sel: AvatarSelection) {
    // Priorità: file caricato -> upload, poi salva URL; altrimenti salva URL/Icona default
    if (sel.file) {
      const form = new FormData();
      form.append('avatar', sel.file);
      // this.http.post<{icon:{id:number,img:string,alt:string}}>(apiUrl('avatars/upload'), form).subscribe({
      this.http.post<{icon:{id:number,img:string,alt:string}}>(apiUrl('avatars/upload'), form)
        .subscribe((res) => {
          const id = res?.icon?.id;
          if (typeof id === 'number') this.updateProfileAvatar(null, id);
        });
      return;
    }
    // Icona di default selezionata: salva icon_id e pulisci avatar_url
    if (typeof sel.iconId === 'number') {
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
  toggleTheme() {
    this.theme.toggleTheme();
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