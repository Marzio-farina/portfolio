import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../core/api/api-url';
import { Attestato } from '../models/attestato.model';
import { Paginated } from './testimonial.service'; // lasciamo il tuo tipo generico

@Injectable({ providedIn: 'root' })
export class AttestatiService {
  private readonly http = inject(HttpClient);

  /** Elenco paginato così come esce dall'API */
  list$(page = 1, perPage = 12, params: Record<string, any> = {}): Observable<Paginated<Attestato>> {
    const url = apiUrl('attestati');
    const q = { page, per_page: perPage, status: 'published', ...params };
    return this.http.get<Paginated<Attestato>>(url, { params: q });
  }

  /** Bulk semplice (usa page=1, per_page=max) */
  listAll$(max = 1000, params: Record<string, any> = {}): Observable<Attestato[]> {
    return this.list$(1, max, params).pipe(map(r => r.data ?? []));
  }

  /**
   * Crea un nuovo attestato
   */
  create$(data: FormData): Observable<Attestato> {
    const url = apiUrl('attestati');
    return this.http.post<Attestato>(url, data);
  }
}
