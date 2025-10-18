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
  private readonly base = (environment.API_BASE_URL || '').replace(/\/+$/, '');

  /**
   * Chiama l'endpoint di test.
   * Con base che include già /api (dev/prod), qui aggiungiamo SOLO /ping.
   */
  getPing(): Observable<PingResponse> {
    const url = this.base ? `${this.base}/ping` : `/api/ping`; // fallback se mai mancasse la base
    return this.http.get<PingResponse>(url);
  }
}
