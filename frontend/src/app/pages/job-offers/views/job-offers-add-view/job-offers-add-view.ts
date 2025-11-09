import { Component, inject } from '@angular/core';
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

