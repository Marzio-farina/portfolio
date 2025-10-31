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

  /** Signal che indica se è stata effettuata una modifica all'attestato */
  hasChanges = signal(false);

  /** Signal che contiene l'attestato appena aggiornato (per aggiornamento immediato della lista) */
  updatedAttestato = signal<Attestato | null>(null);

  /**
   * Apre la modal di dettaglio attestato con l'attestato specificato
   */
  open(attestato: Attestato): void {
    const wasAlreadyOpen = this.isOpen();
    this.selectedAttestato.set(attestato);
    this.isOpen.set(true);
    // Resetta i flag solo quando si apre una NUOVA modal (non quando si riapre dopo un salvataggio)
    if (!wasAlreadyOpen) {
      this.hasChanges.set(false);
      this.updatedAttestato.set(null);
    }
  }

  /**
   * Chiude la modal di dettaglio attestato
   */
  close(): void {
    const wasModified = this.hasChanges();
    this.isOpen.set(false);
    // Pulisci l'attestato selezionato dopo un breve delay per evitare flash durante la chiusura
    setTimeout(() => {
      this.selectedAttestato.set(null);
      // Se c'era una modifica, notifica (attraverso il signal) che serve ricaricare
      // Il componente attestati ascolterà questo signal
      if (wasModified) {
        // Il flag rimane true finché non viene letto e resettato dal componente attestati
      }
    }, 300);
  }

  /**
   * Marca che è stata effettuata una modifica e salva l'attestato aggiornato
   */
  markAsModified(updatedAttestato: Attestato): void {
    this.hasChanges.set(true);
    this.updatedAttestato.set(updatedAttestato); // Salva l'attestato aggiornato per aggiornamento immediato
  }

  /**
   * Reset del flag delle modifiche (chiamato dopo il ricaricamento)
   */
  resetChanges(): void {
    this.hasChanges.set(false);
    this.updatedAttestato.set(null); // Reset anche l'attestato aggiornato
  }
}

