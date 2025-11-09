import { Component, inject, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface JobOffer {
  id: number;
  company: string;
  position: string;
  location: string;
  status: 'pending' | 'interview' | 'accepted' | 'archived';
  appliedDate: string;
  salary?: string;
  notes?: string;
}

@Component({
  selector: 'app-job-offers-stats-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-offers-stats-view.html',
  styleUrl: './job-offers-stats-view.css'
})
export class JobOffersStatsView {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
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

  // Dati delle candidature (mock - verranno dal backend)
  allJobOffers = signal<JobOffer[]>([
    { id: 1, company: 'Google', position: 'Frontend Developer', location: 'Milano', status: 'pending', appliedDate: '2024-01-15', salary: '45k-55k' },
    { id: 2, company: 'Amazon', position: 'Full Stack Developer', location: 'Roma', status: 'interview', appliedDate: '2024-01-20', salary: '50k-60k' },
    { id: 3, company: 'Microsoft', position: 'Angular Developer', location: 'Torino', status: 'accepted', appliedDate: '2024-01-25', salary: '48k-58k' },
    { id: 4, company: 'Meta', position: 'UI/UX Developer', location: 'Milano', status: 'archived', appliedDate: '2024-01-10', salary: '40k-50k' },
    { id: 5, company: 'Apple', position: 'Senior Frontend', location: 'Remote', status: 'pending', appliedDate: '2024-02-01', salary: '55k-65k' },
  ]);

  // Filtri
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  selectedLocation = signal<string>('all');

  // Lista candidature filtrate
  filteredJobOffers = computed(() => {
    let offers = this.allJobOffers();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();
    const location = this.selectedLocation();
    const viewType = this.viewType();

    // Filtra per view type
    if (viewType !== 'total') {
      offers = offers.filter(offer => offer.status === viewType);
    }

    // Filtra per ricerca
    if (query) {
      offers = offers.filter(offer =>
        offer.company.toLowerCase().includes(query) ||
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
    const locations = new Set(this.allJobOffers().map(offer => offer.location));
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

  // Ottieni badge class per status
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'badge-warning',
      interview: 'badge-info',
      accepted: 'badge-success',
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
      archived: 'Archiviata'
    };
    return labels[status] || status;
  }
}

