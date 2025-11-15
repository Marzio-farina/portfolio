import { Component, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../services/tenant.service';
import { ThemeService } from '../../services/theme.service';

/**
 * Componente per visualizzare quando una pagina non viene trovata
 * Può essere usato in due scenari:
 * 1. Pagina non esistente senza slug (dominio/nome_pagina) - profilo principale
 * 2. Pagina non esistente con slug valido (dominio/{slug}/nome_pagina) - profilo specifico
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css'
})
export class NotFound {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tenant = inject(TenantService);
  private theme = inject(ThemeService);
  
  slug = signal<string | null>(null);
  requestedPath = signal<string>('');
  
  // Tema corrente per adattare la grafica
  isDarkMode = computed(() => this.theme.effectiveTheme() === 'dark');

  constructor() {
    // Ottieni lo slug dalla route se presente (caso 2: dominio/{slug}/nome_pagina)
    const slugParam = this.route.snapshot.paramMap.get('userSlug');
    if (slugParam) {
      this.slug.set(slugParam.toLowerCase());
    } else {
      // Se non c'è slug nella route, controlla nel tenant service
      // Potrebbe essere impostato dal resolver se la route wildcard ha già fatto il resolver
      const tenantSlug = this.tenant.userSlug();
      if (tenantSlug) {
        this.slug.set(tenantSlug);
      }
    }
    
    // Ottieni il percorso richiesto
    // Se viene passato come query param (caso 1: senza slug), usalo, altrimenti usa l'URL corrente
    const pathFromQuery = this.route.snapshot.queryParamMap.get('path');
    if (pathFromQuery) {
      this.requestedPath.set(pathFromQuery);
    } else {
      this.requestedPath.set(this.router.url);
    }
  }

  goToProfile(): void {
    if (this.slug()) {
      // Caso 2: Profilo specifico con slug
      this.router.navigate([`/${this.slug()}/about`]);
    } else {
      // Caso 1: Profilo principale (user_id=1)
      this.router.navigate(['/about']);
    }
  }
}

