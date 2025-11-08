import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { JobOfferStatsComponent, JobOfferStats } from '../../components/job-offer-stats/job-offer-stats';
import { EditModeService } from '../../services/edit-mode.service';

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
  
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  editMode = this.edit.isEditing;
  
  // Dati statistiche (placeholder per ora, saranno caricati dal backend)
  statsData = signal<JobOfferStats>({
    total: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    archived: 0,
    emailSent: 0
  });

  // Naviga alla vista dettaglio della categoria selezionata
  onCardClick(cardType: string): void {
    this.router.navigate(['/job-offers', cardType]);
  }

  // Naviga al form di aggiunta nuova candidatura
  onAddClick(): void {
    this.router.navigate(['/job-offers/new']);
  }
}

