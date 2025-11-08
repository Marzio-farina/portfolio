import { Component, input, output } from '@angular/core';

export interface JobOfferStats {
  total: number;
  pending: number;
  interview: number;
  accepted: number;
  archived: number;
  emailSent: number;
}

export type JobOfferCardType = 'total' | 'pending' | 'interview' | 'accepted' | 'archived' | 'email';

@Component({
  selector: 'app-job-offer-stats',
  standalone: true,
  imports: [],
  templateUrl: './job-offer-stats.html',
  styleUrl: './job-offer-stats.css'
})
export class JobOfferStatsComponent {
  stats = input<JobOfferStats>({
    total: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    archived: 0,
    emailSent: 0
  });

  // Emette il tipo di card cliccata
  cardClick = output<JobOfferCardType>();

  onCardClick(type: JobOfferCardType): void {
    this.cardClick.emit(type);
  }
}

