import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface JobOfferEmailColumn {
  id: string;
  title: string;
  fieldName: string;
  visible: boolean;
  order: number;
  sortable?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class JobOfferEmailColumnService {
  /**
   * Restituisce la configurazione default delle colonne per la tabella email.
   * In futuro potrà essere sostituito da una chiamata al backend per colonne personalizzate.
   */
  getColumns(): Observable<JobOfferEmailColumn[]> {
    return of([
      { id: 'subject', title: 'Oggetto', fieldName: 'subject', visible: true, order: 1, sortable: true },
      { id: 'direction', title: 'Tipo', fieldName: 'direction', visible: true, order: 2, sortable: true },
      { id: 'to', title: 'Destinatari', fieldName: 'to', visible: true, order: 3, sortable: false },
      { id: 'bcc', title: 'BCC', fieldName: 'bcc', visible: true, order: 4, sortable: true },
      { id: 'status', title: 'Stato', fieldName: 'status', visible: true, order: 5, sortable: true },
      { id: 'sent_at', title: 'Data', fieldName: 'sent_at', visible: true, order: 6, sortable: true },
      { id: 'related', title: 'Candidatura', fieldName: 'related', visible: true, order: 7, sortable: false },
    ]);
  }
}

