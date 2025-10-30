import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import { TenantService } from '../../services/tenant.service';

export const tenantResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) => {
  const slug = route.paramMap.get('userSlug');
  const tenant = inject(TenantService);
  if (!slug) {
    tenant.clear();
    return of(true);
  }
  return tenant.resolveSlug$(slug).pipe(
    map((res: any) => {
      const id = res?.id ?? res?.user?.id ?? null;
      if (id) tenant.setTenant(slug, id);
      return true;
    })
  );
};


