import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JobOfferCard {
  id: number;
  title: string;
  type: string;
  icon_svg: string;
  visible: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobOfferCardService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_BASE_URL;

  /**
   * Ottiene tutte le card dell'utente autenticato con la configurazione di visibilità
   */
  getCards(): Observable<JobOfferCard[]> {
    return this.http.get<JobOfferCard[]>(`${this.apiUrl}/job-offer-cards`);
  }

  /**
   * Ottiene una card specifica
   */
  getCard(id: number): Observable<JobOfferCard> {
    return this.http.get<JobOfferCard>(`${this.apiUrl}/job-offer-cards/${id}`);
  }

  /**
   * Aggiorna la visibilità di una card
   */
  updateVisibility(id: number, visible: boolean): Observable<JobOfferCard> {
    return this.http.put<JobOfferCard>(`${this.apiUrl}/job-offer-cards/${id}`, { visible });
  }

  /**
   * Toggle della visibilità di una card
   */
  toggleVisibility(id: number): Observable<JobOfferCard> {
    return this.http.patch<JobOfferCard>(`${this.apiUrl}/job-offer-cards/${id}/toggle`, {});
  }
}

