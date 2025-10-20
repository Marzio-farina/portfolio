import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface ContactPayload {
  name: string;
  surname: string;
  email: string;
  subject?: string;
  message: string;
  consent: boolean;
  website?: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);
  private baseUrl = environment.API_BASE_URL;

  send(payload: ContactPayload): Observable<{ ok: boolean; id?: string }> {
    return this.http.post<{ ok: boolean; id?: string }>(
      `${this.baseUrl}/contact`,
      payload
    );
  }
}