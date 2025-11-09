import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JobOfferColumn {
  id: number;
  title: string;
  field_name: string;
  default_order: number;
  visible?: boolean;
  order?: number;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobOfferColumnService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_BASE_URL;

  /**
   * Ottiene le colonne configurate dall'utente autenticato
   */
  getUserColumns(): Observable<JobOfferColumn[]> {
    return this.http.get<JobOfferColumn[]>(`${this.apiUrl}/api/job-offer-columns`);
  }

  /**
   * Aggiorna la visibilità di una colonna
   */
  updateVisibility(columnId: number, visible: boolean): Observable<JobOfferColumn> {
    return this.http.put<JobOfferColumn>(`${this.apiUrl}/api/job-offer-columns/${columnId}`, { visible });
  }

  /**
   * Aggiorna l'ordine delle colonne
   */
  updateOrder(columns: { id: number; order: number }[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/api/job-offer-columns/reorder`, { columns });
  }
}

