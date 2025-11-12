import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Slug Wildcard Guard
 * 
 * Intercetta route non esistenti e reindirizza:
 * - /usertest/paginainesistente → /usertest/about
 * - /paginainesistente → /about
 */
export const slugWildcardGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Lista di route riservate (senza slug)
  const reservedRoutes = new Set([
    'about', 'curriculum', 'progetti', 'attestati', 'contatti',
    'job-offers', 'nuova-recensione', 'auth'
  ]);
  
  // Estrae segmenti dall'URL
  const urlSegments = state.url.split('/').filter(Boolean);
  
  if (urlSegments.length >= 2) {
    // URL con almeno 2 segmenti: es. /usertest/paginainesistente
    const firstSegment = urlSegments[0];
    
    // Se il primo segmento non è una route riservata, è uno slug
    if (!reservedRoutes.has(firstSegment)) {
      // È uno slug con pagina inesistente → reindirizza a slug/about
      router.navigate([firstSegment, 'about']);
      return false;
    }
  }
  
  // URL con 1 segmento o pagina riservata inesistente → /about
  router.navigate(['about']);
  return false;
};

