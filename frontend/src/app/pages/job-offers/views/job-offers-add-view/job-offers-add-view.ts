import { Component, inject, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';

/**
 * Componente per aggiungere una nuova candidatura
 */
@Component({
  selector: 'app-job-offers-add-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-offers-add-view.html',
  styleUrl: './job-offers-add-view.css'
})
export class JobOffersAddView {
  private location = inject(Location);

  // Stato per il dialog LinkedIn
  linkedinDialogOpen = signal<boolean>(false);

  constructor() {
    // Effect per gestire lo scroll del body quando il dialog è aperto
    effect(() => {
      if (this.linkedinDialogOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  /**
   * Gestisce la pressione di Esc per chiudere il dialog
   */
  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.linkedinDialogOpen()) {
      this.closeLinkedInDialog();
    }
  }

  /**
   * Apre il dialog a pieno schermo con LinkedIn Jobs
   */
  openLinkedInDialog(): void {
    this.linkedinDialogOpen.set(true);
  }

  /**
   * Chiude il dialog LinkedIn
   */
  closeLinkedInDialog(): void {
    this.linkedinDialogOpen.set(false);
  }

  /**
   * Gestisce l'annullamento dell'aggiunta
   * Torna alla pagina precedente
   */
  onCancel(): void {
    this.location.back();
  }

  /**
   * Gestisce il salvataggio della nuova candidatura
   */
  onSave(): void {
    // TODO: implementare logica di salvataggio
    console.log('Salvataggio candidatura...');
    // Dopo il salvataggio, torna indietro
    this.location.back();
  }
}

