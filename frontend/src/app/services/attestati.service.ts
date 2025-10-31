import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { apiUrl } from '../core/api/api-url';
import { Attestato } from '../models/attestato.model';
import { Paginated } from './testimonial.service'; // lasciamo il tuo tipo generico

@Injectable({ providedIn: 'root' })
export class AttestatiService {
  private readonly http = inject(HttpClient);

  /** Elenco paginato così come esce dall'API */
  list$(page = 1, perPage = 12, params: Record<string, any> = {}, forceRefresh = false, userId?: number): Observable<Paginated<Attestato>> {
    const url = apiUrl('attestati');
    const q: Record<string, any> = { page, per_page: perPage, status: 'published', ...params };
    if (userId) q['user_id'] = String(userId);
    
    // Aggiungi timestamp per bypassare la cache quando si forza il refresh
    if (forceRefresh) {
      q['_t'] = Date.now();
    }
    
    // Headers per disabilitare cache quando si forza il refresh
    const headers = forceRefresh ? new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }) : undefined;
    
    return this.http.get<Paginated<Attestato>>(url, { 
      params: q,
      headers
    });
  }

  /** Bulk semplice (usa page=1, per_page=max) */
  listAll$(max = 1000, params: Record<string, any> = {}, forceRefresh = false, userId?: number): Observable<Attestato[]> {
    return this.list$(1, max, params, forceRefresh, userId).pipe(map(r => r.data ?? []));
  }

  /**
   * Crea un nuovo attestato
   */
  create$(data: FormData): Observable<Attestato> {
    const url = apiUrl('attestati');
    return this.http.post<Attestato>(url, data);
  }

  /**
   * Aggiorna un attestato esistente
   */
  update$(id: number, data: Partial<{
    title: string;
    description: string;
    issuer: string;
    issued_at: string;
    expires_at: string;
    credential_id: string;
    credential_url: string;
    status: string;
    is_featured: boolean;
  }>): Observable<Attestato> {
    const url = apiUrl(`attestati/${id}`);
    return this.http.put<Attestato>(url, data);
  }

  /**
   * Soft-delete di un attestato
   */
  delete$(id: number) {
    const url = apiUrl(`attestati/${id}`);
    return this.http.delete<void>(url);
  }
}
