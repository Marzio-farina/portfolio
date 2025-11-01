import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../core/api/api-url';

/**
 * DTO per salvare/aggiornare social account
 */
export interface SocialAccountDto {
  provider: string;
  handle?: string | null;
  url?: string | null;
}

/**
 * Risposta dal backend dopo salvataggio
 */
export interface SocialAccountResponse {
  provider: string;
  handle: string | null;
  url: string | null;
}

/**
 * Servizio per gestire i social accounts dell'utente
 */
@Injectable({ providedIn: 'root' })
export class SocialAccountService {
  private readonly http = inject(HttpClient);

  /**
   * Crea o aggiorna un social account
   * @param data Dati del social account
   * @returns Observable con la risposta
   */
  upsert$(data: SocialAccountDto): Observable<SocialAccountResponse> {
    return this.http.post<SocialAccountResponse>(
      apiUrl('/social-accounts'),
      data
    );
  }

  /**
   * Elimina un social account
   * @param provider Nome del provider (es: 'github', 'linkedin', etc.)
   * @returns Observable con la conferma
   */
  delete$(provider: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      apiUrl(`/social-accounts/${provider}`)
    );
  }
}

