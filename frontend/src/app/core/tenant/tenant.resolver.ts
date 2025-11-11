import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';

export const tenantResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) => {
  const slugParam = route.paramMap.get('userSlug');
  const tenant = inject(TenantService);
  const router = inject(Router);
  const auth = inject(AuthService);
  
  if (!slugParam) {
    tenant.clear();
    // Aggiorna il token per la pagina principale
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
  
  return tenant.resolveSlug$(slug).pipe(
    map((res: any) => {
      const id = res?.id ?? res?.user?.id ?? null;
      if (id) {
        tenant.setTenant(slug, id);
        
        // Aggiorna il token signal per lo slug corrente
        auth.refreshTokenSignal();
        
        return true;
      }
      // Slug non trovato → redirect root con notifica
      tenant.clear();
      auth.refreshTokenSignal();
      queueMicrotask(() => router.navigate(['/about'], { replaceUrl: true, state: { toast: { type: 'error', message: 'Utente non esistente' } } }));
      return true;
    }),
    catchError((error) => {
      tenant.clear();
      auth.refreshTokenSignal();
      queueMicrotask(() => router.navigate(['/about'], { replaceUrl: true, state: { toast: { type: 'error', message: 'Errore caricamento profilo utente' } } }));
      return of(true);
    })
  );
};


