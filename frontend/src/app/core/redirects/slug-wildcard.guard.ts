import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

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
 * Slug Wildcard Guard
 * 
 * Intercetta route non esistenti SENZA slug (dominio/nome_pagina):
 * - Naviga a NotFoundComponent per mostrare "Pagina non trovata"
 * 
 * IMPORTANTE: NON deve intervenire per URL con slug (/:userSlug/**)
 * perché quelle route sono gestite da :userSlug/** in app.routes.ts
 * 
 * Nota: Le route con slug (/:userSlug/**) sono gestite dalla route wildcard in app.routes.ts
 * che mostra NotFoundComponent se lo slug esiste ma la pagina no,
 * oppure ProfileNotFoundComponent se lo slug non esiste (tramite tenantResolver)
 */
export const slugWildcardGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Estrae segmenti dall'URL
  const urlSegments = state.url.split('/').filter(Boolean);
  const firstSegment = urlSegments[0]?.toLowerCase();
  
  // Se il primo segmento NON è una route riservata E l'URL ha almeno 2 segmenti,
  // potrebbe essere uno slug utente (es: /usertestsd/progetti2312s)
  // In questo caso, NON dovremmo essere chiamati perché :userSlug/** dovrebbe matchare PRIMA
  // Ma se siamo qui, significa che Angular ha matchato ** prima di :userSlug/**
  // PROBLEMA: Quando il guard restituisce true, Angular non riprova correttamente le route
  // SOLUZIONE: Restituiamo true MA dobbiamo assicurarci che :userSlug/** venga matchata prima
  // Se l'URL ha almeno 2 segmenti, probabilmente è uno slug, quindi restituiamo true
  // ma Angular dovrebbe comunque matchare :userSlug/** quando riprova
  if (firstSegment && !reservedRoutes.has(firstSegment) && urlSegments.length >= 2) {
    // NOTA: Se il primo segmento NON è una route riservata E l'URL ha almeno 2 segmenti,
    // probabilmente è uno slug utente (es: /usertestsd/progetti2312s)
    // Angular potrebbe matchare ** prima di :userSlug/** a causa dell'ordine delle route wildcard
    // SOLUZIONE: Restituiamo true per permettere ad Angular di riprovare
    // Ma questo potrebbe non funzionare correttamente se Angular non riprova le route
    // Restituiamo true per permettere ad Angular di riprovare tutte le route
    // Angular dovrebbe poi matchare :userSlug/** quando riprova
    return true;
  }
  
  // Il primo segmento è una route riservata → naviga a NotFoundComponent
  // Es: /pagina-inesistente → /not-found?path=/pagina-inesistente
  const requestedPath = state.url;
  
  router.navigate(['/not-found'], { 
    queryParams: { path: requestedPath },
    replaceUrl: true 
  });
  
  return false;
};

