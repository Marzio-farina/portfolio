import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobOfferService, JobOffer } from '../../../../services/job-offer.service';

@Component({
  selector: 'app-job-offers-stats-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-offers-stats-view.html',
  styleUrl: './job-offers-stats-view.css'
})
export class JobOffersStatsView implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobOfferService = inject(JobOfferService);
  
  // Legge il titolo dalla route data
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  
  // Determina il tipo di vista dalla route path
  viewType = computed(() => {
    const url = window.location.pathname;
    if (url.includes('/total')) return 'total';
    if (url.includes('/pending')) return 'pending';
    if (url.includes('/interview')) return 'interview';
    if (url.includes('/accepted')) return 'accepted';
    if (url.includes('/archived')) return 'archived';
    if (url.includes('/email')) return 'email';
    return 'total';
  });

  // Dati delle candidature dal backend
  allJobOffers = signal<JobOffer[]>([]);
  
  // Loading state
  loading = signal<boolean>(true);

  // Filtri
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  selectedLocation = signal<string>('all');
  
  // Visibilità filtri
  filtersVisible = signal<boolean>(false);

  ngOnInit(): void {
    this.loadJobOffers();
  }

  // Carica le job offers dal backend
  private loadJobOffers(): void {
    this.loading.set(true);
    this.jobOfferService.getJobOffers().subscribe({
      next: (offers) => {
        this.allJobOffers.set(offers);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento job offers:', err);
        this.loading.set(false);
      }
    });
  }

  // Lista candidature filtrate
  filteredJobOffers = computed(() => {
    let offers = this.allJobOffers();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();
    const location = this.selectedLocation();
    const viewType = this.viewType();

    // Filtra per view type
    if (viewType !== 'total' && viewType !== 'email') {
      offers = offers.filter(offer => offer.status === viewType);
    }

    // Filtra per ricerca
    if (query) {
      offers = offers.filter(offer =>
        offer.company_name.toLowerCase().includes(query) ||
        offer.position.toLowerCase().includes(query)
      );
    }

    // Filtra per status
    if (status !== 'all') {
      offers = offers.filter(offer => offer.status === status);
    }

    // Filtra per location
    if (location !== 'all') {
      offers = offers.filter(offer => offer.location === location);
    }

    return offers;
  });

  // Lista locations uniche
  uniqueLocations = computed(() => {
    const locations = new Set(
      this.allJobOffers()
        .map(offer => offer.location)
        .filter(loc => loc !== null)
    );
    return Array.from(locations).sort();
  });

  // Torna alla pagina principale delle statistiche
  goBack(): void {
    this.router.navigate(['/job-offers']);
  }

  // Reset filtri
  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set('all');
    this.selectedLocation.set('all');
  }

  // Toggle visibilità filtri
  toggleFilters(): void {
    this.filtersVisible.set(!this.filtersVisible());
  }

  // Ottieni badge class per status
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'badge-warning',
      interview: 'badge-info',
      accepted: 'badge-success',
      rejected: 'badge-error',
      archived: 'badge-ghost'
    };
    return classes[status] || 'badge-ghost';
  }

  // Ottieni label tradotta per status
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'In Attesa',
      interview: 'Colloquio',
      accepted: 'Accettata',
      rejected: 'Rifiutata',
      archived: 'Archiviata'
    };
    return labels[status] || status;
  }
}

