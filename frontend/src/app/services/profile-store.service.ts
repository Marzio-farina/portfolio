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
    'auth',
    'not-found',           // Route per pagina non trovata
    'profile-not-found'    // Route per profilo non trovato
  ]);

  /**
   * Verifica se lo slug assomiglia a una route riservata rimuovendo i numeri
   * Es: 'about2321' → rimuove numeri → 'about' → è una route riservata → TRUE
   *     'usertest' → rimuove numeri → 'usertest' → NON è una route riservata → FALSE
   */
  private slugResemblesReservedRoute(slug: string): boolean {
    const normalizedSlug = slug.toLowerCase();
    
    // Rimuove tutti i numeri dallo slug per vedere se assomiglia a una route riservata
    const slugWithoutNumbers = normalizedSlug.replace(/\d+/g, '');
    
    // Se dopo aver rimosso i numeri, lo slug è vuoto o molto corto, non assomiglia
    if (slugWithoutNumbers.length < 3) {
      return false;
    }
    
    // Verifica se lo slug senza numeri corrisponde esattamente a una route riservata
    return this.reservedRoutes.has(slugWithoutNumbers);
  }

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
    const routerUrl = this.router.url;

    console.log('[PROFILE-STORE] ensureLoaded chiamato', {
      force,
      contextKey: context.key,
      contextSlug: context.slug,
      currentKey: this.currentKey,
      routerUrl,
      tenantSlug: this.tenant.userSlug(),
      tenantId: this.tenant.userId(),
      currentProfileSlug: this.profile()?.slug,
      currentProfileId: this.profile()?.id,
      isLoading: this.loading(),
    });

    // IMPORTANTE: NON caricare il profilo se l'URL contiene route speciali
    // Questo previene richieste HTTP inutili quando siamo su /not-found o /profile-not-found
    if (routerUrl.includes('/not-found') || routerUrl.includes('/profile-not-found')) {
      console.log('[PROFILE-STORE] URL contiene route speciale, non carico profilo', { routerUrl });
      return;
    }

    // Se il contesto è lo stesso e il profilo è già caricato o in caricamento, non fare nulla
    if (
      !force &&
      this.currentKey === context.key &&
      (this.profile() !== null || this.loading())
    ) {
      console.log('[PROFILE-STORE] Profilo già caricato o in caricamento, non faccio nulla');
      return;
    }

    // IMPORTANTE: Se il tenant è già impostato con lo stesso slug, non resettare il profilo
    // Questo evita di resettare il profilo durante la navigazione tra pagine dello stesso profilo
    if (context.slug) {
      // IMPORTANTE: Prima di caricare il profilo, verifica se lo slug assomiglia a una route riservata
      // Se assomiglia, probabilmente è una pagina non esistente del profilo principale (es: /about2321/about)
      // quindi NON caricare il profilo per evitare richieste HTTP inutili
      // MA: Se lo slug NON assomiglia a una route riservata, carica comunque il profilo
      // anche se la pagina potrebbe non esistere, perché lo slug potrebbe esistere e vogliamo mostrarlo nell'aside
      const slugResemblesReserved = this.slugResemblesReservedRoute(context.slug);
      if (slugResemblesReserved) {
        console.log('[PROFILE-STORE] Slug assomiglia a una route riservata, non carico profilo (il resolver navigherà a /not-found)', {
          slug: context.slug,
          routerUrl,
        });
        return;
      }

      const tenantSlug = this.tenant.userSlug();
      const tenantId = this.tenant.userId();
      const currentProfileSlug = this.profile()?.slug?.toLowerCase();
      
      // Se il tenant è già impostato con lo stesso slug E il profilo è già caricato per lo stesso slug,
      // non cambiare currentKey per evitare di resettare il profilo
      if (tenantSlug === context.slug && tenantId && currentProfileSlug === context.slug) {
        // Il profilo è già caricato per lo stesso slug → non fare nulla
        console.log('[PROFILE-STORE] Tenant e profilo già impostati per lo stesso slug, non faccio nulla', {
          slug: context.slug,
          tenantSlug,
          currentProfileSlug,
        });
        return;
      }
      
      // IMPORTANTE: Se il tenant NON è ancora impostato per questo slug, verifica se il resolver sta già caricando il profilo
      // Se il resolver sta caricando il profilo, NON caricarlo di nuovo per evitare richieste duplicate
      // Se il resolver NON sta caricando il profilo, verifica se lo slug assomiglia a una route riservata
      // Se assomiglia, NON caricare il profilo perché probabilmente è una pagina non esistente
      if (!tenantSlug || tenantSlug !== context.slug || !tenantId) {
        // Se lo slug assomiglia a una route riservata, NON caricare il profilo
        // Il resolver gestirà la navigazione a /not-found o /profile-not-found
        const slugResemblesReserved = this.slugResemblesReservedRoute(context.slug);
        if (slugResemblesReserved) {
          console.log('[PROFILE-STORE] Tenant non impostato e slug assomiglia a route riservata, non carico profilo (resolver gestirà)', {
            slug: context.slug,
            tenantSlug,
            tenantId,
            routerUrl,
          });
          return;
        }
        
        // Altrimenti, carica il profilo normalmente
        // Il resolver potrebbe non essere chiamato o potrebbe non gestire questo caso
        console.log('[PROFILE-STORE] Tenant non ancora impostato, carico profilo normalmente', {
          slug: context.slug,
          tenantSlug,
          tenantId,
          routerUrl,
        });
      }
    }

    console.log('[PROFILE-STORE] Carico profilo', {
      contextKey: context.key,
      contextSlug: context.slug,
      force,
    });

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
    // Passa lo slug a runRequest per permettere la gestione della navigazione a ProfileNotFound
    return this.runRequest(this.about.getBySlug(normalized), normalized);
  }

  private resolveContext(): { key: string; slug: string | null } {
    // Priorità 1: usa lo slug dal tenant service se è già impostato
    // Questo è importante per mantenere il contesto durante la navigazione
    const tenantSlug = this.tenant.userSlug();

    if (tenantSlug) {
      const normalized = tenantSlug.toLowerCase();
      const context = { key: `slug:${normalized}`, slug: normalized };
      console.log('[PROFILE-STORE] resolveContext: uso tenant slug', {
        tenantSlug,
        normalized,
        context,
        routerUrl: this.router.url,
      });
      return context;
    }

    // Priorità 2: estrai lo slug dall'URL
    const segments = this.router.url.split('/').filter(Boolean);
    const first = segments[0]?.toLowerCase() ?? '';

    if (first && !this.reservedRoutes.has(first)) {
      const context = { key: `slug:${first}`, slug: first };
      console.log('[PROFILE-STORE] resolveContext: estraggo slug da URL', {
        first,
        segments,
        routerUrl: this.router.url,
        context,
        isReserved: this.reservedRoutes.has(first),
      });
      return context;
    }

    const context = { key: 'root', slug: null };
    console.log('[PROFILE-STORE] resolveContext: uso root (profilo principale)', {
      first,
      segments,
      routerUrl: this.router.url,
      isReserved: first ? this.reservedRoutes.has(first) : false,
      context,
    });
    return context;
  }

  private loadDefaultProfile(force = false): Observable<PublicProfileDto> {
    if (!force && this.currentKey === 'root' && this.profile()) {
      return of(this.profile()!);
    }

    this.currentKey = 'root';
    return this.runRequest(this.about.get$());
  }

  private runRequest(source$: Observable<PublicProfileDto>, slug?: string): Observable<PublicProfileDto> {
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
        
        // IMPORTANTE: Se ottieni un errore 404 E c'è uno slug, significa che lo slug non esiste
        // Naviga a ProfileNotFoundComponent invece di propagare l'errore
        if (err?.status === 404 && slug) {
          console.log('[PROFILE-STORE] Errore 404 durante caricamento profilo, navigo a ProfileNotFound', {
            slug: slug,
            routerUrl: this.router.url,
          });
          // Naviga a ProfileNotFoundComponent
          Promise.resolve().then(() => {
            this.router.navigate(['/profile-not-found', slug], { replaceUrl: true });
          });
          // Restituisci un observable che completa senza emettere valori
          // per evitare di propagare l'errore
          return of(null as any);
        }
        
        // Per altri errori o se non c'è slug, propaga l'errore normalmente
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


