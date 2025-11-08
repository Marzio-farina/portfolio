import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of } from 'rxjs';
import { TenantService } from '../../services/tenant.service';

/**
 * Resolver per pulire il tenant quando si accede a route pubbliche senza userSlug
 * 
 * Questo resolver assicura che il tenant venga resettato quando si naviga
 * su route che non hanno un parametro userSlug (es: /about, /nuova-recensione)
 */
export const clearTenantResolver: ResolveFn<boolean> = () => {
  const tenant = inject(TenantService);
  tenant.clear();
  return of(true);
};

