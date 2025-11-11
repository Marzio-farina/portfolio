import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of } from 'rxjs';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';

/**
 * Resolver per pulire il tenant quando si accede a route pubbliche senza userSlug
 * 
 * Questo resolver assicura che il tenant venga resettato quando si naviga
 * su route che non hanno un parametro userSlug (es: /about, /nuova-recensione)
 */
export const clearTenantResolver: ResolveFn<boolean> = () => {
  const tenant = inject(TenantService);
  const auth = inject(AuthService);
  
  tenant.clear();
  
  // ✅ FONDAMENTALE: Aggiorna il token per la pagina principale
  // Questo caricherà l'ID utente autenticato se esiste un token
  auth.refreshTokenSignal();
  
  return of(true);
};

