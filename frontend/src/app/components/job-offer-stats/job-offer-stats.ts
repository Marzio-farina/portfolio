import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { JobOfferCardService, JobOfferCard } from '../../services/job-offer-card.service';

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
  imports: [CommonModule],
  templateUrl: './job-offer-stats.html',
  styleUrl: './job-offer-stats.css'
})
export class JobOfferStatsComponent implements OnInit {
  private cardService = inject(JobOfferCardService);
  private sanitizer = inject(DomSanitizer);

  stats = input<JobOfferStats>({
    total: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    archived: 0,
    emailSent: 0
  });

  // Indica se siamo in modalità edit (mostra card "Aggiungi")
  editMode = input<boolean>(false);

  // Card caricate dal database
  cards = signal<JobOfferCard[]>([]);

  // Loading state
  loading = signal<boolean>(true);

  // Emette il tipo di card cliccata
  cardClick = output<JobOfferCardType>();
  
  // Emette quando viene cliccata la card "Aggiungi"
  addClick = output<void>();

  ngOnInit(): void {
    this.loadCards();
  }

  private loadCards(): void {
    this.loading.set(true);
    this.cardService.getCards().subscribe({
      next: (cards) => {
        // Filtra solo le card visibili
        const visibleCards = cards.filter(c => c.visible);
        this.cards.set(visibleCards);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento card:', err);
        this.loading.set(false);
      }
    });
  }

  onCardClick(type: JobOfferCardType): void {
    this.cardClick.emit(type);
  }

  onAddClick(): void {
    this.addClick.emit();
  }

  // Sanitizza l'SVG per il rendering sicuro
  sanitizeSvg(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  // Ottieni il valore delle statistiche per tipo
  getStatValue(type: string): number {
    const statsMap: Record<string, keyof JobOfferStats> = {
      'total': 'total',
      'pending': 'pending',
      'interview': 'interview',
      'accepted': 'accepted',
      'archived': 'archived',
      'email': 'emailSent'
    };
    
    const key = statsMap[type];
    return key ? this.stats()[key] : 0;
  }

  // Mappa dei colori per tipo di card
  getCardClass(type: string): string {
    return `stat-card__icon--${type}`;
  }
}

