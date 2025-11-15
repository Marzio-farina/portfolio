import { Component, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { ProfileStoreService } from '../../services/profile-store.service';

/**
 * Componente per visualizzare quando un profilo utente non viene trovato
 * (slug non esistente)
 */
@Component({
  selector: 'app-profile-not-found',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-not-found.html',
  styleUrl: './profile-not-found.css'
})
export class ProfileNotFound {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private theme = inject(ThemeService);
  private profileStore = inject(ProfileStoreService);
  
  slug = signal<string | null>(null);
  
  // Tema corrente per adattare la grafica
  isDarkMode = computed(() => this.theme.effectiveTheme() === 'dark');

  constructor() {
    // Ottieni lo slug dalla route
    const slugParam = this.route.snapshot.paramMap.get('userSlug');
    if (slugParam) {
      this.slug.set(slugParam.toLowerCase());
    }
    
    // IMPORTANTE: Carica il profilo principale nell'aside
    // Il clearTenantResolver ha già pulito il tenant, quindi ensureLoaded()
    // dovrebbe caricare il profilo principale (senza slug)
    // Usa force = true per assicurarsi che il profilo venga ricaricato
    // anche se era già caricato per un altro contesto
    this.profileStore.ensureLoaded(true);
  }
}

