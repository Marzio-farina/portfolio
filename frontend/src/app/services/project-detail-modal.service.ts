import { Injectable, signal } from '@angular/core';
import { Progetto } from '../components/progetti-card/progetti-card';

/**
 * Servizio per gestire lo stato della modal di dettaglio progetto
 * Permette di aprire/chiudere la modal da qualsiasi componente
 */
@Injectable({ providedIn: 'root' })
export class ProjectDetailModalService {
  /** Signal che indica se la modal è aperta */
  isOpen = signal(false);

  /** Signal che contiene il progetto da visualizzare */
  selectedProject = signal<Progetto | null>(null);

  /** Signal che indica se è stata effettuata una modifica al progetto */
  hasChanges = signal(false);

  /** Signal che contiene il progetto appena aggiornato (per aggiornamento immediato della lista) */
  updatedProject = signal<Progetto | null>(null);

  /**
   * Apre la modal di dettaglio progetto con il progetto specificato
   */
  open(project: Progetto): void {
    const wasAlreadyOpen = this.isOpen();
    this.selectedProject.set(project);
    this.isOpen.set(true);
    // Resetta i flag solo quando si apre una NUOVA modal (non quando si riapre dopo un salvataggio)
    if (!wasAlreadyOpen) {
      this.hasChanges.set(false);
      this.updatedProject.set(null);
    }
  }

  /**
   * Chiude la modal di dettaglio progetto
   */
  close(): void {
    this.isOpen.set(false);
    // Pulisci il progetto selezionato dopo un breve delay per evitare flash durante la chiusura
    setTimeout(() => {
      this.selectedProject.set(null);
    }, 300);
  }

  /**
   * Marca che è stata effettuata una modifica e salva il progetto aggiornato
   */
  markAsModified(updatedProject: Progetto): void {
    this.hasChanges.set(true);
    this.updatedProject.set(updatedProject); // Salva il progetto aggiornato per aggiornamento immediato
  }

  /**
   * Reset del flag delle modifiche (chiamato dopo il ricaricamento)
   */
  resetChanges(): void {
    this.hasChanges.set(false);
    this.updatedProject.set(null); // Reset anche il progetto aggiornato
  }
}

