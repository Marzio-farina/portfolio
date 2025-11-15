import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  
  slug = signal<string | null>(null);

  constructor() {
    // Ottieni lo slug dalla route
    const slugParam = this.route.snapshot.paramMap.get('userSlug');
    if (slugParam) {
      this.slug.set(slugParam.toLowerCase());
    }
  }

  goToHome(): void {
    this.router.navigate(['/about']);
  }
}

