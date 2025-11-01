import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, shareReplay } from 'rxjs';
// Se già usi questo helper altrove, il path giusto dal folder /services è questo:
import { apiUrl } from '../core/api/api-url';
import { Router } from '@angular/router';

/** Singolo social link esposto dal backend */
export type SocialLink = {
  provider: string;      // es. 'github', 'linkedin', 'instagram', ...
  handle: string | null; // es. 'MarzioFarina'
  url: string | null;    // es. 'https://github.com/MarzioFarina'
};

/** DTO profilo pubblico per la pagina About */
export interface PublicProfileDto {
  id: number;
  name: string;
  surname: string | null;
  email: string;
  title: string | null;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  location_url?: string | null;
  avatar_url: string | null;

  // date
  date_of_birth: string | null;     // "YYYY-MM-DD"
  date_of_birth_it: string | null;  // "dd/mm/YYYY"
  age: number | null;

  socials: SocialLink[];
}

@Injectable({ providedIn: 'root' })
export class AboutProfileService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private cache = new Map<string, Observable<PublicProfileDto>>();

  /**
   * Restituisce il profilo pubblico per l'Aside (nome, cognome, email, phone,
   * location, compleanno, socials).
   *
   * Dev:  http://localhost:8000/api/public-profile
   * Prod: https://api.marziofarina.it/api/api/public-profile
   */
  get$(userId?: number): Observable<PublicProfileDto> {
    // Se non è passato userId e la URL contiene slug, dirotta su slug (no TenantService per evitare cicli)
    if (userId === undefined) {
      const slug = this.peekSlugFromUrl();
      if (slug) return this.getBySlug(slug);
    }
    const key = userId ? `u:${userId}` : 'root';
    const cached = this.cache.get(key);
    if (cached) return cached;

    const url = userId ? apiUrl(`users/${userId}/public-profile`) : apiUrl('public-profile');
    const stream = this.http.get<PublicProfileDto>(url).pipe(
      map(res => ({
        ...res,
        socials: (res.socials ?? []).map(s => ({
          ...s,
          provider: (s.provider ?? '').toLowerCase()
        }))
      })),
      shareReplay(1)
    );

    this.cache.set(key, stream);
    return stream;
  }

  getBySlug(slug: string): Observable<PublicProfileDto> {
    const key = `s:${slug}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const stream = this.http.get<PublicProfileDto>(apiUrl(`${slug}/public-profile`)).pipe(
      map(res => ({
        ...res,
        socials: (res.socials ?? []).map(s => ({
          ...s,
          provider: (s.provider ?? '').toLowerCase()
        }))
      })),
      shareReplay(1)
    );
    this.cache.set(key, stream);
    return stream;
  }

  private peekSlugFromUrl(): string | null {
    const segments = this.router.url.split('/').filter(Boolean);
    const first = segments[0] || '';
    const reserved = new Set(['about','curriculum','progetti','attestati','contatti']);
    return first && !reserved.has(first) ? first : null;
  }

  /**
   * Invalida la cache del profilo per forzare un nuovo caricamento
   */
  clearCache(): void {
    this.cache.clear();
  }
}