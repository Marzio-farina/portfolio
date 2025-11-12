import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TenantRouterService } from '../services/tenant-router.service';

/**
 * Auth Guard
 * 
 * Protegge le rotte che richiedono autenticazione.
 * Se l'utente non è autenticato, reindirizza alla pagina about con notifica.
 * Per job-offers, verifica anche che lo slug nel path corrisponda allo slug dell'utente autenticato.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const tenantRouter = inject(TenantRouterService);
  const router = inject(Router);
  
  if (!authService.isAuthenticated()) {
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
  }
  
  // Verifica per rotte job-offers: lo slug nel path deve corrispondere all'utente autenticato
  const isJobOffersRoute = state.url.includes('/job-offers');
  
  if (isJobOffersRoute) {
    const userSlug = authService.getUserSlug();
    const urlSlug = route.paramMap.get('userSlug');
    
    // Se c'è uno slug nel path e non corrisponde all'utente autenticato, nega accesso
    if (urlSlug && urlSlug !== userSlug) {
      // Reindirizza alla job-offers dell'utente autenticato
      if (userSlug) {
        router.navigate([userSlug, 'job-offers']);
      } else {
        router.navigate(['job-offers']);
      }
      return false;
    }
  }
  
  return true;
};

