import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { TenantService } from '../../services/tenant.service';

export const tenantResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) => {
  const slug = route.paramMap.get('userSlug');
  const tenant = inject(TenantService);
  const router = inject(Router);
  if (!slug) {
    tenant.clear();
    return of(true);
  }
  return tenant.resolveSlug$(slug).pipe(
    map((res: any) => {
      const id = res?.id ?? res?.user?.id ?? null;
      if (id) {
        tenant.setTenant(slug, id);
        return true;
      }
      // Slug non trovato → redirect root con notifica
      tenant.clear();
      queueMicrotask(() => router.navigate(['/about'], { replaceUrl: true, state: { toast: { type: 'error', message: 'Utente non esistente' } } }));
      return true;
    }),
    catchError(() => {
      tenant.clear();
      queueMicrotask(() => router.navigate(['/about'], { replaceUrl: true, state: { toast: { type: 'error', message: 'Utente non esistente' } } }));
      return of(true);
    })
  );
};


