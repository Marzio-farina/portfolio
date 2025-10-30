import { Injectable, signal } from '@angular/core';
import { Attestato } from '../models/attestato.model';

/**
 * Servizio per gestire lo stato della modal di dettaglio attestato
 * Permette di aprire/chiudere la modal da qualsiasi componente
 */
@Injectable({ providedIn: 'root' })
export class AttestatoDetailModalService {
  /** Signal che indica se la modal è aperta */
  isOpen = signal(false);

  /** Signal che contiene l'attestato da visualizzare */
  selectedAttestato = signal<Attestato | null>(null);

  /**
   * Apre la modal di dettaglio attestato con l'attestato specificato
   */
  open(attestato: Attestato): void {
    this.selectedAttestato.set(attestato);
    this.isOpen.set(true);
  }

  /**
   * Chiude la modal di dettaglio attestato
   */
  close(): void {
    this.isOpen.set(false);
    // Pulisci l'attestato selezionato dopo un breve delay per evitare flash durante la chiusura
    setTimeout(() => {
      this.selectedAttestato.set(null);
    }, 300);
  }
}

