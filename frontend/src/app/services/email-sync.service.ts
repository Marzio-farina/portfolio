import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EmailSyncStats {
  imported: number;
  skipped: number;
  errors: number;
  synced_date?: string;
}

export interface EmailSyncResponse {
  success: boolean;
  message: string;
  stats?: EmailSyncStats;
}

@Injectable({
  providedIn: 'root'
})
export class EmailSyncService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_BASE_URL;

  /**
   * Sincronizza le email iCloud per l'utente autenticato
   * Timeout esteso a 5 minuti per consentire la sincronizzazione completa
   */
  syncEmails(): Observable<EmailSyncResponse> {
    return this.http.post<EmailSyncResponse>(
      `${this.apiUrl}/api/emails/sync`, 
      {}
    ).pipe(
      // Timeout di 5 minuti (300000ms) per la sincronizzazione
      // La prima sync può richiedere tempo con molte email
      timeout(300000)
    );
  }

  /**
   * Testa la connessione iCloud
   */
  testConnection(): Observable<EmailSyncResponse> {
    return this.http.post<EmailSyncResponse>(`${this.apiUrl}/api/emails/test-connection`, {});
  }
}

