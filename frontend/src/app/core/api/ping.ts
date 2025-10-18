import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';

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
   * Con base che include già /api (dev/prod), qui aggiungiamo SOLO /ping.
   */
  getPing(): Observable<PingResponse> {
    return this.http.get<PingResponse>(apiUrl('/ping'));
  }
}
