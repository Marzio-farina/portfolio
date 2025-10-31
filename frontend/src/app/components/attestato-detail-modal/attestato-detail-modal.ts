import { Component, inject, input, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { AttestatoDetailModalService } from '../../services/attestato-detail-modal.service';
import { Attestato } from '../../models/attestato.model';

@Component({
  selector: 'app-attestato-detail-modal',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './attestato-detail-modal.html',
  styleUrls: ['./attestato-detail-modal.css', './attestato-detail-modal.responsive.css']
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
  
  // Altezza fissa del contenitore
  containerHeight = 300;
  
  // Larghezza calcolata dinamicamente basata sull'aspect ratio
  containerWidth = signal<number | null>(null);

  // Indica se l'immagine è verticale (height > width)
  isVerticalImage = signal<boolean>(false);

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
   * Gestisce il caricamento dell'immagine per calcolare l'aspect ratio e la larghezza del contenitore
   */
  onImgLoad(ev: Event): void {
    const el = ev.target as HTMLImageElement;
    if (el?.naturalWidth && el?.naturalHeight) {
      const width = el.naturalWidth;
      const height = el.naturalHeight;
      
      // Calcola aspect ratio
      this.aspectRatio.set(`${width} / ${height}`);
      
      // Determina se l'immagine è verticale (height > width)
      this.isVerticalImage.set(height > width);
      
      // Calcola la larghezza del contenitore basata sull'altezza fissa e l'aspect ratio
      // Larghezza = Altezza contenitore * (larghezza immagine / altezza immagine)
      const calculatedWidth = this.containerHeight * (width / height);
      this.containerWidth.set(calculatedWidth);
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

