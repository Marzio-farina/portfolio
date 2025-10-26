import { Component, DestroyRef, Inject, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map, startWith } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { Avatar } from "../avatar/avatar";
import { AboutProfileService, PublicProfileDto, SocialLink } from '../../services/about-profile.service'
import { makeLoadable } from '../../core/utils/loadable-signal';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-aside',
  standalone: true,
  templateUrl: './aside.html',
  styleUrl: './aside.css',
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
  imports: [Avatar],
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

   // === DATI PROFILO (API) ===
  private readonly svc = inject(AboutProfileService);
  private readonly dr  = inject(DestroyRef);
  readonly theme = inject(ThemeService);

  // loadable (data/loading/error + reload)
  private readonly load = makeLoadable<PublicProfileDto>(() => this.svc.get$(), this.dr);

  profile  = this.load.data;      // Signal<PublicProfileDto | null>
  loading  = this.load.loading;   // Signal<boolean>
  errorMsg = this.load.error;     // Signal<string | null>
  reload() { this.load.reload(); }

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
  }

  toggleContacts() {
    if (this.viewMode() !== 'large') this.expanded.update(v => !v);
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