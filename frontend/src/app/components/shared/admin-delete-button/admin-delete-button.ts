import { Component, input, output } from '@angular/core';

/**
 * Bottone admin per cancellazione con conferma
 * Mostra X per cancellare, ↩ per annullare
 */
@Component({
  selector: 'app-admin-delete-button',
  standalone: true,
  template: `
    <button 
      class="admin-x-btn"
      type="button"
      [class.is-cancel]="isDeleting()"
      [attr.aria-label]="isDeleting() 
        ? (cancelLabel() || 'Annulla eliminazione') 
        : (deleteLabel() || 'Elimina')"
      [attr.title]="isDeleting() 
        ? (cancelLabel() || 'Annulla eliminazione') 
        : (deleteLabel() || 'Elimina')"
      (click)="buttonClick.emit($event)">
      <span aria-hidden="true">{{ isDeleting() ? '↩' : '×' }}</span>
    </button>
  `,
  styles: [`
    /* Stili base - possono essere sovrascritti dal componente parent */
    .admin-x-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 4px solid #ef4444;
      background: transparent;
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0;
      line-height: 1;
      font-weight: 800;
      transition: transform var(--transition-1), box-shadow var(--transition-1), opacity var(--transition-1);
      z-index: 10001; /* Sopra l'overlay di cancellazione */
      padding: 0;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
    }

    :host-context(.card-wrapper:hover) .admin-x-btn,
    :host-context(.attestato-card:hover) .admin-x-btn {
      opacity: 1;
      pointer-events: auto;
    }

    /* Mostra sempre il bottone quando è in stato deleting (is-cancel) */
    .admin-x-btn.is-cancel {
      border-color: #10b981;
      color: #10b981;
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    /* Forza visibilità del bottone quando il parent è in stato deleting */
    :host-context(.is-deleting) .admin-x-btn {
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    .admin-x-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 18px rgba(239, 68, 68, 0.35);
    }

    .admin-x-btn.is-cancel:hover {
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
    }

    .admin-x-btn:active {
      transform: scale(1.0);
    }

    .admin-x-btn > span {
      display: block;
      font-size: 30px !important;
      line-height: 1;
      font-weight: 900;
    }
  `]
})
export class AdminDeleteButton {
  isDeleting = input<boolean>(false);
  deleteLabel = input<string>('Elimina');
  cancelLabel = input<string>('Annulla eliminazione');
  
  buttonClick = output<Event>();
}

