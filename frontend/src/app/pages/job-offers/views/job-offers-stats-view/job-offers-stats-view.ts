import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-job-offers-stats-view',
  standalone: true,
  imports: [],
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

  // Torna alla pagina principale delle statistiche
  goBack(): void {
    this.router.navigate(['/job-offers']);
  }
}

