import { Component, input, output } from '@angular/core';

/**
 * Bottone admin per cancellazione con conferma
 * Mostra X per cancellare, ↩ per annullare
 */
@Component({
  selector: 'app-admin-delete-button',
  standalone: true,
  templateUrl: './admin-delete-button.html',
  styleUrl: './admin-delete-button.css'
})
export class AdminDeleteButton {
  isDeleting = input<boolean>(false);
  deleteLabel = input<string>('Elimina');
  cancelLabel = input<string>('Annulla eliminazione');
  
  buttonClick = output<Event>();
}

