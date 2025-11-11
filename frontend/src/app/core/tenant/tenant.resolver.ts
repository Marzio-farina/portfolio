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
  
  console.log('🔍 TenantResolver: Original slug:', slugParam, '→ Normalized:', slug);
  
  // Se lo slug nell'URL è diverso da quello normalizzato, reindirizza alla versione corretta
  if (slugParam !== slug) {
    console.log('🔄 TenantResolver: Redirecting to normalized slug URL');
    // Ricostruisci il path completo con slug normalizzato
    const pathSegments = route.url.map(segment => segment.path);
    const correctedPath = `/${slug}/${pathSegments.slice(1).join('/')}`;
    queueMicrotask(() => router.navigateByUrl(correctedPath, { replaceUrl: true }));
    return of(false);
  }
  
  console.log('🌐 TenantResolver: Calling API for slug:', slug);
  
  return tenant.resolveSlug$(slug).pipe(
    map((res: any) => {
      console.log('✅ TenantResolver: API Response:', res);
      const id = res?.id ?? res?.user?.id ?? null;
      if (id) {
        console.log('✅ TenantResolver: Setting tenant - Slug:', slug, 'ID:', id);
        tenant.setTenant(slug, id);
        
        // Aggiorna il token signal per lo slug corrente
        auth.refreshTokenSignal();
        console.log('🔄 TenantResolver: Token signal aggiornato per slug:', slug);
        
        return true;
      }
      // Slug non trovato → redirect root con notifica
      console.warn('⚠️ TenantResolver: No ID in response, redirecting to /about');
      tenant.clear();
      auth.refreshTokenSignal();
      queueMicrotask(() => router.navigate(['/about'], { replaceUrl: true, state: { toast: { type: 'error', message: 'Utente non esistente' } } }));
      return true;
    }),
    catchError((error) => {
      console.error('❌ TenantResolver: ERROR for slug:', slug);
      console.error('❌ Error details:', {
        message: error?.message,
        status: error?.status,
        url: error?.url,
        name: error?.name
      });
      console.error('❌ Redirecting to /about due to error');
      tenant.clear();
      auth.refreshTokenSignal();
      queueMicrotask(() => router.navigate(['/about'], { replaceUrl: true, state: { toast: { type: 'error', message: 'Errore caricamento profilo utente' } } }));
      return of(true);
    })
  );
};


