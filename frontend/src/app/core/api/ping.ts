import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface PingResponse {
  ok: boolean;
  time: string; // es. "2025-10-17 12:34:56"
}

@Injectable({
  providedIn: 'root'
})
export class Ping {
  private readonly http = inject(HttpClient);

  /**
   * Chiama l'endpoint di test.
   * Backend (subdominio): GET {API_BASE_URL}/api/ping
   * Rewrite stessa origin: GET /api/ping
   */
  getPing(): Observable<PingResponse> {
    const url = environment.API_BASE_URL ? `${environment.API_BASE_URL}/ping` : `/ping`;
    return this.http.get<PingResponse>(url);
  }
}
