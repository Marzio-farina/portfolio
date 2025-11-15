import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';
import { ProfileStoreService } from '../../services/profile-store.service';

/**
 * Route riservate che non sono slug utente
 */
const reservedRoutes = new Set([
  'about',
  'curriculum',
  'progetti',
  'attestati',
  'contatti',
  'job-offers',
  'nuova-recensione',
  'auth',
  'not-found',
  'profile-not-found'
]);

/**
 * Verifica se lo slug assomiglia a una route riservata rimuovendo i numeri
 * Es: 'about2321' → rimuove numeri → 'about' → è una route riservata → TRUE
 *     'usertest' → rimuove numeri → 'usertest' → NON è una route riservata → FALSE
 */
function slugResemblesReservedRoute(slug: string): boolean {
  const normalizedSlug = slug.toLowerCase();
  
  // Rimuove tutti i numeri dallo slug per vedere se assomiglia a una route riservata
  const slugWithoutNumbers = normalizedSlug.replace(/\d+/g, '');
  
  // Se dopo aver rimosso i numeri, lo slug è vuoto o molto corto, non assomiglia
  if (slugWithoutNumbers.length < 3) {
    return false;
  }
  
  // Verifica se lo slug senza numeri corrisponde esattamente a una route riservata
  return reservedRoutes.has(slugWithoutNumbers);
}

export const tenantResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) => {
  const slugParam = route.paramMap.get('userSlug');
  const tenant = inject(TenantService);
  const router = inject(Router);
  const auth = inject(AuthService);
  const profileStore = inject(ProfileStoreService);
  
  // Log per debugging
  const routePath = route.url.map(segment => segment.path).join('/');
  console.log('[TENANT-RESOLVER] Inizio resolver', {
    slugParam,
    routePath,
    fullUrl: route.url.map(s => s.path).join('/'),
    currentTenantSlug: tenant.userSlug(),
    currentTenantId: tenant.userId(),
    currentProfileSlug: profileStore.profile()?.slug,
    currentProfileId: profileStore.profile()?.id,
  });
  
  // Evita di eseguire il resolver per le route speciali (ciclo infinito)
  if (routePath.includes('profile-not-found') || routePath.includes('not-found')) {
    // Se siamo già su una route speciale, restituisci true per permettere al componente di essere mostrato
    console.log('[TENANT-RESOLVER] Route speciale rilevata, restituisco true', { routePath });
    tenant.clear();
    auth.refreshTokenSignal();
    return of(true);
  }
  
  if (!slugParam) {
    console.log('[TENANT-RESOLVER] Nessuno slugParam, pulisco tenant');
    tenant.clear();
    // Aggiorna il token per la pagina principale
    auth.refreshTokenSignal();
    return of(true);
  }
  
  // IMPORTANTE: Se lo slug è 'not-found', NON trattarlo come uno slug utente
  // Questo può succedere se Angular matcha :userSlug/** prima di /not-found
  if (slugParam.toLowerCase() === 'not-found') {
    console.log('[TENANT-RESOLVER] Slug "not-found" rilevato, pulisco tenant e restituisco true');
    tenant.clear();
    auth.refreshTokenSignal();
    return of(true);
  }
  
  // Normalizza lo slug in minuscolo per coerenza con il database
  const slug = slugParam.toLowerCase();
  
  // Se lo slug nell'URL è diverso da quello normalizzato, reindirizza alla versione corretta
  if (slugParam !== slug) {
    // Ricostruisci il path completo con slug normalizzato
    const pathSegments = route.url.map(segment => segment.path);
    const correctedPath = `/${slug}/${pathSegments.slice(1).join('/')}`;
    queueMicrotask(() => router.navigateByUrl(correctedPath, { replaceUrl: true }));
    return of(false);
  }
  
  // IMPORTANTE: Estrai il secondo segmento dell'URL per verificare se è una route riservata valida
  // Es: /2312s/about → pageSegment = 'about'
  // Es: /2312s/xyz → pageSegment = 'xyz'
  const pathSegments = route.url.map(segment => segment.path);
  const pageSegment = pathSegments.length > 1 ? pathSegments[1].toLowerCase() : null;
  const isReservedPage = pageSegment ? reservedRoutes.has(pageSegment) : false;
  
  console.log('[TENANT-RESOLVER] Verifica pagina', {
    slug,
    pathSegments,
    pageSegment,
    isReservedPage,
  });
  
  // Se la pagina è una route riservata valida (es: 'about', 'progetti'), significa che l'utente
  // sta cercando di accedere a una pagina specifica del profilo.
  // In questo caso, devo verificare se lo slug esiste via HTTP.
  // Se la pagina NON è una route riservata valida, potrebbe essere:
  // 1. Una pagina non esistente sotto uno slug valido → NotFoundComponent
  // 2. Uno slug non esistente → ProfileNotFoundComponent
  // Quindi devo comunque verificare se lo slug esiste via HTTP.
  
  // Verifica se il profilo è già caricato nel tenant service O nel profile store
  const currentTenantSlug = tenant.userSlug();
  const currentTenantId = tenant.userId();
  const currentProfile = profileStore.profile();
  
  // Se il tenant è già impostato con lo stesso slug, lo slug ESISTE
  // Restituisci true immediatamente senza fare richieste HTTP
  // Questo permette al componente NotFound di essere mostrato per pagine non esistenti
  if (currentTenantSlug === slug && currentTenantId) {
    // Il tenant è già impostato con lo stesso slug → lo slug ESISTE
    // IMPORTANTE: Non fare richieste HTTP, restituisci true per mostrare NotFoundComponent
    console.log('[TENANT-RESOLVER] Tenant già impostato, restituisco true immediatamente', {
      slug,
      currentTenantSlug,
      currentTenantId,
    });
    return of(true);
  }
  
  // Controlla anche se il profilo è già caricato nel profile store con lo stesso slug
  const profileSlug = currentProfile?.slug?.toLowerCase();
  if (profileSlug === slug && currentProfile?.id) {
    // Il profilo esiste già nel profile store → imposta il tenant e restituisci true
    // IMPORTANTE: Non fare richieste HTTP, restituisci true per mostrare NotFoundComponent
    console.log('[TENANT-RESOLVER] Profilo già caricato nel profile store, imposto tenant e restituisco true', {
      slug,
      profileSlug,
      profileId: currentProfile?.id,
    });
    tenant.setTenant(slug, currentProfile.id);
    auth.refreshTokenSignal();
    return of(true);
  }
  
  // IMPORTANTE: Prima di caricare il profilo via HTTP, verifica se lo slug assomiglia a una route riservata
  // Se assomiglia, probabilmente è una pagina non esistente del profilo principale (es: /about2321/about)
  // e NON uno slug non esistente. In questo caso, naviga direttamente a NotFoundComponent
  // senza fare richieste HTTP
  // 
  // MA: Se la pagina è una route riservata valida (es: 'about'), potrebbe essere un caso valido
  // di uno slug che assomiglia a una route riservata (es: 'about123') che vuole accedere a '/about123/about'
  // In questo caso specifico, NON navigare a /not-found ma verifica comunque se lo slug esiste via HTTP
  const resemblesReservedRoute = slugResemblesReservedRoute(slug);
  
  if (resemblesReservedRoute && !isReservedPage) {
    // Lo slug assomiglia a una route riservata MA la pagina NON è una route riservata valida
    // → probabilmente è una pagina non esistente del profilo principale (es: /about2321/xyz)
    // Naviga a NotFoundComponent passando il path richiesto come query param
    console.log('[TENANT-RESOLVER] Slug assomiglia a una route riservata ma pagina non valida, navigo a NotFoundComponent', {
      slug,
      pageSegment,
      originalUrl: route.url.map(s => s.path).join('/'),
    });
    tenant.clear();
    auth.refreshTokenSignal();
    
    // Costruisci il path originale per passarlo a NotFoundComponent
    const originalPath = '/' + pathSegments.join('/');
    
    queueMicrotask(() => {
      router.navigate(['/not-found'], { 
        queryParams: { path: originalPath },
        replaceUrl: true 
      });
    });
    return of(false);
  }
  
  // Se la pagina è una route riservata valida (es: 'about', 'progetti'), oppure
  // se lo slug NON assomiglia a una route riservata, verifica se lo slug esiste via HTTP
  if (resemblesReservedRoute && isReservedPage) {
    console.log('[TENANT-RESOLVER] Slug assomiglia a route riservata MA pagina è una route riservata valida, verifico se slug esiste via HTTP', {
      slug,
      pageSegment,
    });
  }
  
  console.log('[TENANT-RESOLVER] Nessun tenant/profilo trovato, carico profilo via HTTP', {
    slug,
    currentTenantSlug,
    currentTenantId,
    currentProfileSlug: profileSlug,
    currentProfileId: currentProfile?.id,
    resemblesReservedRoute: false,
  });
  
  // Altrimenti, carica il profilo tramite HTTP (solo se non è già caricato)
  // Prima di fare la richiesta, verifica di nuovo se nel frattempo il tenant è stato impostato
  // (potrebbe succedere se ProfileStoreService.ensureLoaded() viene chiamato durante la navigazione)
  const finalCheckTenantSlug = tenant.userSlug();
  const finalCheckTenantId = tenant.userId();
  if (finalCheckTenantSlug === slug && finalCheckTenantId) {
    // Il tenant è stato impostato nel frattempo → restituisci true
    return of(true);
  }
  
  // Usa force = false per evitare richieste HTTP inutili se il profilo è già in cache
  return profileStore.loadProfileForSlug(slug, false).pipe(
    map((profile) => {
      const id = profile?.id ?? null;
      if (id) {
        // Profilo trovato → imposta il tenant e restituisci true
        console.log('[TENANT-RESOLVER] Profilo caricato via HTTP, imposto tenant', {
          slug,
          id,
          profileSlug: profile?.slug,
        });
        tenant.setTenant(slug, id);
        auth.refreshTokenSignal();
        return true;
      }
      // Profilo null (non dovrebbe mai succedere se la richiesta HTTP ha successo)
      // Ma per sicurezza, naviga a ProfileNotFound
      tenant.clear();
      auth.refreshTokenSignal();
      queueMicrotask(() => router.navigate(['/profile-not-found', slug], { replaceUrl: true }));
      return false;
    }),
    catchError((error) => {
      // ERRORE HTTP: verifica se il profilo è stato caricato nel frattempo
      const profileNow = profileStore.profile();
      const profileSlugNow = profileNow?.slug?.toLowerCase();
      const hasProfileNow = profileSlugNow === slug && profileNow?.id;
      
      // Verifica di nuovo il tenant (potrebbe essere stato impostato da un'altra richiesta)
      const tenantSlugNow = tenant.userSlug();
      const tenantIdNow = tenant.userId();
      const hasTenantNow = tenantSlugNow === slug && tenantIdNow;
      
      console.log('[TENANT-RESOLVER] Errore HTTP durante caricamento profilo', {
        slug,
        errorStatus: error?.status,
        hasTenantNow,
        hasProfileNow,
        tenantSlugNow,
        tenantIdNow,
        profileSlugNow,
        profileIdNow: profileNow?.id,
      });
      
      // Se c'è un errore ma il profilo esiste già (tenant o profileStore),
      // significa che lo slug ESISTE e la pagina non esiste
      // Restituisci true per mostrare NotFoundComponent
      if (hasTenantNow || hasProfileNow) {
        // Imposta il tenant se necessario
        if (!hasTenantNow && hasProfileNow && profileNow?.id) {
          console.log('[TENANT-RESOLVER] Profilo trovato durante errore, imposto tenant');
          tenant.setTenant(slug, profileNow.id);
          auth.refreshTokenSignal();
        }
        // Lo slug esiste → restituisci true per mostrare NotFoundComponent
        console.log('[TENANT-RESOLVER] Slug esiste (tenant/profilo trovato), restituisco true per NotFoundComponent');
        return of(true);
      }
      
      // Altrimenti, lo slug NON esiste → naviga a ProfileNotFound
      console.log('[TENANT-RESOLVER] Slug NON esiste, navigo a ProfileNotFound', { slug });
      tenant.clear();
      auth.refreshTokenSignal();
      
      // Gestisci errori 404 specificamente - naviga al componente ProfileNotFound
      if (error?.status === 404 || error?.originalError?.status === 404) {
        queueMicrotask(() => router.navigate(['/profile-not-found', slug], { replaceUrl: true }));
      } else {
        // Per altri errori, naviga alla home
        queueMicrotask(() => router.navigate(['/about'], { replaceUrl: true }));
      }
      return of(false);
    })
  );
};


