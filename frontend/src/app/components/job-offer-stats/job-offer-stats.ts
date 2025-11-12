import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { JobOfferCardService, JobOfferCard } from '../../services/job-offer-card.service';

export interface JobOfferStats {
  total: number;
  pending: number;
  interview: number;
  accepted: number;
  rejected: number;
  archived: number;
  emailTotal: number;
  emailSent: number;
  emailReceived: number;
  emailBcc: number;
  vip: number;
  drafts: number;
  sentMail: number;
  junkMail: number;
  trash: number;
  mailArchive: number;
}

export type JobOfferCardType =
  | 'total'
  | 'pending'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'archived'
  | 'email'
  | 'email-total'
  | 'email-sent'
  | 'email-received'
  | 'email-bcc'
  | 'vip'
  | 'drafts'
  | 'sent-mail'
  | 'junk-mail'
  | 'trash'
  | 'mail-archive';

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

  // Indica se siamo in modalità edit (mostra card "Aggiungi")
  editMode = input<boolean>(false);

  // Card caricate dal database
  cards = signal<JobOfferCard[]>([]);

  // Card nascoste (visible = false)
  hiddenCards = signal<JobOfferCard[]>([]);

  // Loading state
  loading = signal<boolean>(true);
  
  // Loading state per le statistiche
  statsLoading = input<boolean>(true);

  // Stato del modal
  showModal = signal<boolean>(false);

  // Posizione del modal
  modalPosition = signal<{ top: number; left: number } | null>(null);

  // Emette il tipo di card cliccata
  cardClick = output<JobOfferCardType>();
  
  // Emette quando le card visibili cambiano
  visibleCardsChange = output<string[]>();

  ngOnInit(): void {
    this.loadCards();
  }

  private loadCards(): void {
    this.loading.set(true);
    this.cardService.getCards().subscribe({
      next: (cards) => {
        // Separa le card visibili e nascoste
        const visibleCards = cards.filter(c => c.visible);
        const hiddenCardsList = cards.filter(c => !c.visible);
        this.cards.set(visibleCards);
        this.hiddenCards.set(hiddenCardsList);
        this.loading.set(false);
        
        // Emetti i tipi delle card visibili
        const visibleTypes = visibleCards.map(c => c.type);
        this.visibleCardsChange.emit(visibleTypes);
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

  onAddClick(event: MouseEvent): void {
    // Ottieni la posizione della card cliccata
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Salva la posizione dell'angolo superiore sinistro della card
    this.modalPosition.set({
      top: rect.top,
      left: rect.left
    });
    
    // Apri il modal
    this.showModal.set(true);
  }

  // Chiudi il modal
  closeModal(): void {
    this.showModal.set(false);
    this.modalPosition.set(null);
  }

  // Ottieni gli stili di posizionamento per il modal
  getModalPositionStyles(): { top: string; left: string } | null {
    const pos = this.modalPosition();
    if (!pos) return null;
    
    return {
      top: `${pos.top}px`,
      left: `${pos.left}px`
    };
  }

  // Determina il numero di colonne per il grid del modal
  getModalGridColumns(): string {
    const count = this.hiddenCards().length;
    return count < 4 ? 'modal-cards-grid--2-cols' : 'modal-cards-grid--3-cols';
  }

  // Nascondi una card (imposta visible=false) - aggiornamento ottimistico
  hideCard(cardId: number): void {
    // Trova la card da nascondere
    const cardToHide = this.cards().find(c => c.id === cardId);
    if (!cardToHide) return;
    
    // Aggiornamento ottimistico: modifica immediatamente l'UI
    const updatedCards = this.cards().filter(c => c.id !== cardId);
    this.cards.set(updatedCards);
    
    // Crea una copia della card con visible=false
    const hiddenCard = { ...cardToHide, visible: false };
    this.hiddenCards.set([...this.hiddenCards(), hiddenCard]);
    
    // Emetti i nuovi tipi visibili
    const visibleTypes = updatedCards.map(c => c.type);
    this.visibleCardsChange.emit(visibleTypes);
    
    // Chiamata API in background
    this.cardService.updateVisibility(cardId, false).subscribe({
      next: (updatedCard) => {
        // Aggiorna la card nascosta con i dati dal server (se necessario)
        const currentHiddenCards = this.hiddenCards();
        const index = currentHiddenCards.findIndex(c => c.id === cardId);
        if (index !== -1) {
          const newHiddenCards = [...currentHiddenCards];
          newHiddenCards[index] = updatedCard;
          this.hiddenCards.set(newHiddenCards);
        }
      },
      error: (err) => {
        console.error('Errore nascondimento card:', err);
        // Rollback in caso di errore
        this.cards.set([...this.cards(), cardToHide]);
        const updatedHiddenCards = this.hiddenCards().filter(c => c.id !== cardId);
        this.hiddenCards.set(updatedHiddenCards);
        
        // Re-emetti i tipi visibili dopo il rollback
        const visibleTypes = this.cards().map(c => c.type);
        this.visibleCardsChange.emit(visibleTypes);
      }
    });
  }

  // Mostra una card nascosta (imposta visible=true) - aggiornamento ottimistico
  showCard(cardId: number): void {
    // Trova la card da mostrare
    const cardToShow = this.hiddenCards().find(c => c.id === cardId);
    if (!cardToShow) return;
    
    // Aggiornamento ottimistico: modifica immediatamente l'UI
    const updatedHiddenCards = this.hiddenCards().filter(c => c.id !== cardId);
    this.hiddenCards.set(updatedHiddenCards);
    
    // Crea una copia della card con visible=true
    const visibleCard = { ...cardToShow, visible: true };
    const updatedVisibleCards = [...this.cards(), visibleCard];
    this.cards.set(updatedVisibleCards);
    
    // Emetti i nuovi tipi visibili
    const visibleTypes = updatedVisibleCards.map(c => c.type);
    this.visibleCardsChange.emit(visibleTypes);
    
    // Chiudi il modal se non ci sono più card nascoste
    if (updatedHiddenCards.length === 0) {
      this.closeModal();
    }
    
    // Chiamata API in background
    this.cardService.updateVisibility(cardId, true).subscribe({
      next: (updatedCard) => {
        // Aggiorna la card visibile con i dati dal server (se necessario)
        const currentCards = this.cards();
        const index = currentCards.findIndex(c => c.id === cardId);
        if (index !== -1) {
          const newCards = [...currentCards];
          newCards[index] = updatedCard;
          this.cards.set(newCards);
        }
      },
      error: (err) => {
        console.error('Errore visualizzazione card:', err);
        // Rollback in caso di errore
        this.hiddenCards.set([...this.hiddenCards(), cardToShow]);
        const updatedCards = this.cards().filter(c => c.id !== cardId);
        this.cards.set(updatedCards);
        
        // Re-emetti i tipi visibili dopo il rollback
        const visibleTypes = updatedCards.map(c => c.type);
        this.visibleCardsChange.emit(visibleTypes);
        
        // Riapri il modal se era stato chiuso
        if (updatedHiddenCards.length === 0) {
          this.showModal.set(true);
        }
      }
    });
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
      'rejected': 'rejected',
      'archived': 'archived',
      'email': 'emailTotal',
      'email-total': 'emailTotal',
      'email-sent': 'emailSent',
      'email-received': 'emailReceived',
      'email-bcc': 'emailBcc',
      'vip': 'vip',
      'drafts': 'drafts',
      'sent-mail': 'sentMail',
      'junk-mail': 'junkMail',
      'trash': 'trash',
      'mail-archive': 'mailArchive'
    };
    
    const key = statsMap[type];
    return key ? this.stats()[key] : 0;
  }

  // Mappa dei colori per tipo di card
  getCardClass(type: string): string {
    return `stat-card__icon--${type}`;
  }
}

