import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subscription, filter, of, shareReplay } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AboutProfileService, PublicProfileDto } from './about-profile.service';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class ProfileStoreService {
  private readonly about = inject(AboutProfileService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);

  private readonly reservedRoutes = new Set([
    'about',
    'curriculum',
    'progetti',
    'attestati',
    'contatti',
    'job-offers',
    'nuova-recensione',
    'auth'
  ]);

  private currentKey: string | null = null;
  private currentRequest: Subscription | null = null;

  readonly profile = signal<PublicProfileDto | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.ensureLoaded());
  }

  /**
   * Ricarica forzatamente il profilo per il contesto corrente.
   * Utile dopo un salvataggio o per aggiornare i dati.
   */
  refresh(): void {
    this.currentKey = null;
    this.ensureLoaded(true);
  }

  /**
   * Invalida lo stato attuale (es. quando si esce dalla pagina o si cambia utente).
   */
  reset(): void {
    this.currentRequest?.unsubscribe();
    this.currentRequest = null;
    this.currentKey = null;
    this.profile.set(null);
    this.loading.set(false);
    this.error.set(null);
  }

  /**
   * Assicura che il profilo per l'URL corrente sia caricato.
   * @param force Se true, ignora la cache e rilancia la richiesta.
   */
  ensureLoaded(force = false): void {
    const context = this.resolveContext();

    if (
      !force &&
      this.currentKey === context.key &&
      (this.profile() !== null || this.loading())
    ) {
      return;
    }

    this.currentKey = context.key;
    if (context.slug) {
      this.loadProfileForSlug(context.slug, force);
    } else {
      this.loadDefaultProfile(force);
    }
  }

  loadProfileForSlug(slug: string, force = false): Observable<PublicProfileDto> {
    const normalized = slug.toLowerCase();

    if (!force && this.currentKey === `slug:${normalized}` && this.profile()) {
      return of(this.profile()!);
    }

    this.currentKey = `slug:${normalized}`;
    return this.runRequest(this.about.getBySlug(normalized));
  }

  private resolveContext(): { key: string; slug: string | null } {
    const tenantSlug = this.tenant.userSlug();

    if (tenantSlug) {
      const normalized = tenantSlug.toLowerCase();
      return { key: `slug:${normalized}`, slug: normalized };
    }

    const segments = this.router.url.split('/').filter(Boolean);
    const first = segments[0]?.toLowerCase() ?? '';

    if (first && !this.reservedRoutes.has(first)) {
      return { key: `slug:${first}`, slug: first };
    }

    return { key: 'root', slug: null };
  }

  private loadDefaultProfile(force = false): Observable<PublicProfileDto> {
    if (!force && this.currentKey === 'root' && this.profile()) {
      return of(this.profile()!);
    }

    this.currentKey = 'root';
    return this.runRequest(this.about.get$());
  }

  private runRequest(source$: Observable<PublicProfileDto>): Observable<PublicProfileDto> {
    this.currentRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    const shared$ = source$.pipe(
      tap((data) => {
        this.profile.set(data);
        this.loading.set(false);
        this.error.set(null);
      }),
      catchError((err) => {
        const message =
          err?.status === 404
            ? 'Profilo non trovato'
            : 'Errore durante il caricamento del profilo';

        this.profile.set(null);
        this.loading.set(false);
        this.error.set(message);
        return throwError(() => err);
      }),
      shareReplay(1)
    );

    this.currentRequest = shared$.subscribe({
      next: () => {},
      error: () => {
        this.currentRequest = null;
      },
      complete: () => {
        this.currentRequest = null;
      }
    });

    return shared$;
  }
}


