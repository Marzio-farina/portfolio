import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JobOfferEmailColumn {
  id: number;
  title: string;
  field_name: string;
  default_order: number;
  visible?: boolean;
  order?: number;
}

@Injectable({
  providedIn: 'root'
})
export class JobOfferEmailColumnService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_BASE_URL;

  /**
   * Ottiene le colonne configurate dall'utente autenticato
   */
  getUserColumns(): Observable<JobOfferEmailColumn[]> {
    return this.http.get<JobOfferEmailColumn[]>(`${this.apiUrl}/api/job-offer-email-columns`);
  }

  /**
   * Aggiorna la visibilità di una colonna
   */
  updateVisibility(columnId: number, visible: boolean): Observable<JobOfferEmailColumn> {
    return this.http.put<JobOfferEmailColumn>(`${this.apiUrl}/api/job-offer-email-columns/${columnId}`, { visible });
  }

  /**
   * Aggiorna l'ordine delle colonne
   */
  updateOrder(columns: { id: number; order: number }[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/api/job-offer-email-columns/reorder`, { columns });
  }

  /**
   * Aggiorna l'ordine delle colonne tramite array di IDs
   */
  updateColumnOrder(columnIds: number[]): Observable<JobOfferEmailColumn[]> {
    return this.http.put<JobOfferEmailColumn[]>(`${this.apiUrl}/api/job-offer-email-columns/reorder`, { column_ids: columnIds });
  }
}
