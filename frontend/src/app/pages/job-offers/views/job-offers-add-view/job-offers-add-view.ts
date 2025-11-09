import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { TenantService } from '../../../../services/tenant.service';

/**
 * Componente per aggiungere una nuova candidatura
 */
@Component({
  selector: 'app-job-offers-add-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-offers-add-view.html',
  styleUrl: './job-offers-add-view.css'
})
export class JobOffersAddView {
  private location = inject(Location);
  private router = inject(Router);
  private tenantService = inject(TenantService);

  /**
   * Naviga alla vista risultati scraping
   * TODO: mostrare dialog con form per keyword e location
   */
  searchJobs(): void {
    console.log('🔍 Navigazione a risultati scraping...');
    
    const tenantSlug = this.tenantService.userSlug();
    const basePath = tenantSlug ? `/${tenantSlug}/job-offers/search-results` : '/job-offers/search-results';
    
    // TODO: passare parametri di ricerca via query params o state
    this.router.navigate([basePath]);
  }

  /**
   * Gestisce l'annullamento dell'aggiunta
   * Torna alla pagina precedente
   */
  onCancel(): void {
    this.location.back();
  }

  /**
   * Gestisce il salvataggio della nuova candidatura
   */
  onSave(): void {
    // TODO: implementare logica di salvataggio
    console.log('Salvataggio candidatura...');
    // Dopo il salvataggio, torna indietro
    this.location.back();
  }
}

