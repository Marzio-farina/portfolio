import { Component, inject, input, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { AttestatoDetailModalService } from '../../services/attestato-detail-modal.service';
import { Attestato } from '../../models/attestato.model';

@Component({
  selector: 'app-attestato-detail-modal',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './attestato-detail-modal.html',
  styleUrls: ['./attestato-detail-modal.css']
})
export class AttestatoDetailModal {
  private attestatoDetailModalService = inject(AttestatoDetailModalService);

  // Riceve l'attestato dal servizio tramite computed
  attestato = input.required<Attestato>();

  // Output per comunicare al componente padre
  closed = output<void>();

  // Aspect ratio per le immagini senza width/height
  aspectRatio = signal<string | null>(null);
  defaultAR = '16 / 9';

  /**
   * Chiude la modal
   */
  onClose(): void {
    this.attestatoDetailModalService.close();
    this.closed.emit();
  }

  /**
   * Gestisce il click sul link del badge
   */
  onBadgeClick(event: Event): void {
    event.stopPropagation();
    // Il link aprirà automaticamente in una nuova scheda
  }

  /**
   * Gestisce il caricamento dell'immagine per calcolare l'aspect ratio
   */
  onImgLoad(ev: Event): void {
    const el = ev.target as HTMLImageElement;
    if (el?.naturalWidth && el?.naturalHeight) {
      this.aspectRatio.set(`${el.naturalWidth} / ${el.naturalHeight}`);
    }
  }

  /**
   * Formatta la data in formato italiano
   */
  formatDate(dateString?: string | null): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }
}

