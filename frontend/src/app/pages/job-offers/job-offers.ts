import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { JobOfferStatsComponent, JobOfferStats } from '../../components/job-offer-stats/job-offer-stats';
import { EditModeService } from '../../services/edit-mode.service';
import { JobOfferService } from '../../services/job-offer.service';
import { AuthService } from '../../services/auth.service';

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
  
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  editMode = this.edit.isEditing;
  
  // Dati statistiche (caricati dal backend)
  statsData = signal<JobOfferStats>({
    total: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    archived: 0,
    emailSent: 0
  });

  // Loading state per le statistiche
  statsLoading = signal<boolean>(true);

  // Naviga alla vista dettaglio della categoria selezionata
  onCardClick(cardType: string): void {
    // Usa sempre lo slug dell'utente autenticato, non quello pubblico visualizzato
    const userSlug = this.auth.getUserSlug();
    
    if (!userSlug) {
      console.error('Nessun utente autenticato per navigare a job-offers');
      return;
    }
    
    this.router.navigate([userSlug, 'job-offers', cardType]);
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
        archived: 0,
        emailSent: 0
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

