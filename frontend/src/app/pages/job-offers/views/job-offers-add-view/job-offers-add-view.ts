import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../../../services/tenant.service';
import { JobOfferService } from '../../../../services/job-offer.service';
import { NotificationService } from '../../../../services/notification.service';

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
  private router = inject(Router);
  private tenantService = inject(TenantService);
  private jobOfferService = inject(JobOfferService);
  private notificationService = inject(NotificationService);

  // Form fields
  companyName = signal('');
  recruiterCompany = signal('');
  position = signal('');
  workMode = signal('');
  location = signal('');
  announcementDate = signal('');
  applicationDate = signal('');
  website = signal('');
  isRegistered = signal(false);
  status = signal<'pending' | 'interview' | 'accepted' | 'rejected' | 'archived'>('pending');
  salaryRange = signal('');
  notes = signal('');

  /**
   * Naviga alla vista risultati scraping
   * TODO: mostrare dialog con form per keyword e location
   */
  searchJobs(): void {    
    const tenantSlug = this.tenantService.userSlug();
    const basePath = tenantSlug ? `/${tenantSlug}/job-offers/search-results` : '/job-offers/search-results';
    
    // TODO: passare parametri di ricerca via query params o state
    this.router.navigate([basePath]);
  }

  /**
   * Gestisce l'annullamento dell'aggiunta
   * Torna alla pagina job-offers
   */
  onCancel(): void {
    const tenantSlug = this.tenantService.userSlug();
    const basePath = tenantSlug ? `/${tenantSlug}/job-offers` : '/job-offers';
    this.router.navigate([basePath]);
  }

  /**
   * Gestisce il salvataggio della nuova candidatura
   */
  onSave(): void {
    // Validazione base
    if (!this.companyName().trim() || !this.position().trim()) {
      this.notificationService.add(
        'warning',
        'Compila almeno i campi Azienda e Posizione',
        'job-offer-validation'
      );
      return;
    }

    // Prepara i dati da inviare
    const jobOfferData = {
      company_name: this.companyName(),
      recruiter_company: this.recruiterCompany() || null,
      position: this.position(),
      work_mode: this.workMode() || null,
      location: this.location() || null,
      announcement_date: this.announcementDate() || null,
      application_date: this.applicationDate() || null,
      website: this.website() || null,
      is_registered: this.isRegistered(),
      status: this.status(),
      salary_range: this.salaryRange() || null,
      notes: this.notes() || null
    };

    // Salva nel database
    this.jobOfferService.createJobOffer(jobOfferData).subscribe({
      next: () => {
        this.notificationService.add(
          'success',
          'Candidatura salvata con successo!',
          'job-offer-save'
        );
        // Torna alla lista job-offers
        const tenantSlug = this.tenantService.userSlug();
        const basePath = tenantSlug ? `/${tenantSlug}/job-offers` : '/job-offers';
        this.router.navigate([basePath]);
      },
      error: (err) => {
        console.error('Errore durante il salvataggio:', err);
        this.notificationService.add(
          'error',
          'Errore durante il salvataggio della candidatura',
          'job-offer-save-error'
        );
      }
    });
  }
}

