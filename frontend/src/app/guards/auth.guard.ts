import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TenantRouterService } from '../services/tenant-router.service';

/**
 * Auth Guard
 * 
 * Protegge le rotte che richiedono autenticazione.
 * Se l'utente non è autenticato, reindirizza alla pagina about con notifica.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const tenantRouter = inject(TenantRouterService);
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  // Reindirizza alla pagina about con notifica di errore
  tenantRouter.navigate(['about'], {
    state: {
      toast: {
        message: 'Non autorizzato',
        type: 'error'
      }
    }
  });
  return false;
};

