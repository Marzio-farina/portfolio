import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { Attestato } from '../components/attestati-card/attestati-card';
import { HttpClient } from '@angular/common/http';
import { Paginated } from './testimonial.service';
import { apiUrl } from '../core/api/api-url';

@Injectable({ providedIn: 'root' })
export class AttestatiService {
  private readonly http = inject(HttpClient);

  /** Chiamata paginata */
  list$(page = 1, perPage = 12, params: Record<string, any> = {}): Observable<Paginated<Attestato>> {
    const url = apiUrl('attestati');
    const q = { page, per_page: perPage, status: 'published', ...params };

    return this.http.get<Paginated<AttestatoDto>>(url, { params: q }).pipe(
      map(res => ({
        ...res,
        data: (res.data ?? []).map(dtoToAttestato)
      }))
    );
  }

  /** Caricamento “bulk” (occhio ai volumi) */
  listAll$(max = 1000, params: Record<string, any> = {}): Observable<Attestato[]> {
    return this.list$(1, max, params).pipe(map(r => r.data ?? []));
  }
}

/** DTO come esce dalla tua API Laravel Resource */
export type AttestatoDto = {
  id: number;
  title: string;
  issuer: string | null;
  issued_at: string | null;   // ISO 'YYYY-MM-DD'
  expires_at: string | null;
  poster: string | null;
  credential_id: string | null;
  credential_url: string | null;
  is_featured: boolean;
  sort_order: number | null;
  description?: string | null;
};

function dtoToAttestato(p: AttestatoDto): Attestato {
  return {
    id: p.id,
    title: p.title,
    ente: p.issuer ?? 'Ente non specificato',
    data: p.issued_at ?? undefined,
    cover: p.poster ?? '',
    pdf: '',                            // nel tuo schema non c’è un PDF: lo lasciamo vuoto
    badgeUrl: p.credential_url ?? '',   // lo usiamo per “Vedi badge / Verifica credenziale”
    skills: []                          // non presenti a DB; opzionale
  };
}