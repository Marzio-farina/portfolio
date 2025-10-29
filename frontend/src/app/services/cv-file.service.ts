import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../core/api/api-url';

/**
 * Interfaccia per la risposta del CV file
 */
export interface CvFileResponse {
  success: boolean;
  cv?: {
    id: number;
    filename: string;
    title: string | null;
    file_size: number | null;
    is_default?: boolean;
    download_url: string;
  };
  message?: string;
}

/**
 * Interfaccia per la lista di CV files
 */
export interface CvFilesListResponse {
  success: boolean;
  cvs: Array<{
    id: number;
    filename: string;
    title: string | null;
    file_size: number | null;
    is_default: boolean;
    created_at: string;
    download_url: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class CvFileService {
  private readonly http = inject(HttpClient);

  /**
   * Ottiene il CV di default per un utente specifico
   * @param userId ID dell'utente (opzionale)
   * @returns Observable con il CV di default
   */
  getDefault$(userId?: number): Observable<CvFileResponse> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('user_id', userId.toString());
    }
    return this.http.get<CvFileResponse>(apiUrl('cv-files/default'), { 
      params
    });
  }

  /**
   * Ottiene tutti i CV files di un utente autenticato
   * @returns Observable con la lista di CV files
   */
  getAll$(): Observable<CvFilesListResponse> {
    return this.http.get<CvFilesListResponse>(apiUrl('cv-files'));
  }

  /**
   * Download del file PDF
   * Usa window.open per aprire il download in una nuova finestra
   * @param downloadUrl URL del file da scaricare
   */
  downloadFile(downloadUrl: string): void {
    // Usa window.open per avviare il download
    window.open(downloadUrl, '_blank');
  }

  /**
   * Download diretto tramite ID
   * @param id ID del file CV
   */
  downloadById(id: number): void {
    const url = apiUrl(`cv-files/${id}/download`);
    this.downloadFile(url);
  }
}

