import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { JobOfferStatsComponent, JobOfferStats } from '../../components/job-offer-stats/job-offer-stats';
import { EditModeService } from '../../services/edit-mode.service';
import { JobOfferService } from '../../services/job-offer.service';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';

@Component({
  selector: 'app-job-offers',
  standalone: true,
  imports: [JobOfferStatsComponent],
  templateUrl: './job-offers.html',
  styleUrl: './job-offers.css'
})
export class JobOffers {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private edit = inject(EditModeService);
  private jobOfferService = inject(JobOfferService);
  private auth = inject(AuthService);
  private tenantService = inject(TenantService);
  
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  editMode = this.edit.isEditing;
  
  // Dati statistiche (caricati dal backend)
  statsData = signal<JobOfferStats>({
    total: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    rejected: 0,
    archived: 0,
    emailTotal: 0,
    emailSent: 0,
    emailReceived: 0,
    emailBcc: 0,
    vip: 0,
    drafts: 0,
    sentMail: 0,
    junkMail: 0,
    trash: 0,
    mailArchive: 0
  });

  // Loading state per le statistiche
  statsLoading = signal<boolean>(true);

  // Naviga alla vista dettaglio della categoria selezionata
  onCardClick(cardType: string): void {
    // Controlla se l'URL corrente ha uno slug
    const currentSlug = this.tenantService.userSlug();
    
    if (currentSlug) {
      // Siamo su un path con slug → usa lo slug dell'utente autenticato
      const userSlug = this.auth.getUserSlug();
      
      if (!userSlug) {
        console.error('Nessun utente autenticato per navigare a job-offers');
        return;
      }
      
      this.router.navigate([userSlug, 'job-offers', cardType]);
    } else {
      // Siamo su un path senza slug → naviga senza slug
      this.router.navigate(['job-offers', cardType]);
    }
  }

  // Gestisce il cambio di card visibili e ricarica le statistiche
  onVisibleCardsChange(visibleTypes: string[]): void {
    // Se non ci sono card visibili, azzera le stats
    if (visibleTypes.length === 0) {
      this.statsData.set({
        total: 0,
        pending: 0,
        interview: 0,
        accepted: 0,
        rejected: 0,
        archived: 0,
        emailTotal: 0,
        emailSent: 0,
        emailReceived: 0,
        emailBcc: 0,
        vip: 0,
        drafts: 0,
        sentMail: 0,
        junkMail: 0,
        trash: 0,
        mailArchive: 0
      });
      this.statsLoading.set(false);
      return;
    }

    // Imposta loading a true prima di caricare
    this.statsLoading.set(true);

    // Ricarica le statistiche con i nuovi tipi visibili
    this.jobOfferService.getStats(visibleTypes).subscribe({
      next: (stats) => {
        this.statsData.set(stats);
        this.statsLoading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento statistiche:', err);
        this.statsLoading.set(false);
      }
    });
  }
}

