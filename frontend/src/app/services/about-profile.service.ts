import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, shareReplay } from 'rxjs';
// Se già usi questo helper altrove, il path giusto dal folder /services è questo:
import { apiUrl } from '../core/api/api-url';
import { Router } from '@angular/router';
import { TenantService } from './tenant.service';

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
  slug?: string | null;
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
  private readonly tenant = inject(TenantService);
  private cache = new Map<string, Observable<PublicProfileDto>>();

  /**
   * Restituisce il profilo pubblico per l'Aside (nome, cognome, email, phone,
   * location, compleanno, socials).
   *
   * Dev:  http://localhost:8000/api/public-profile
   * Prod: https://api.marziofarina.it/api/api/public-profile
   */
  get$(userId?: number): Observable<PublicProfileDto> {
    // Caso 1: richiesta esplicita per userId
    if (userId !== undefined) {
      return this.getProfileByUserId(userId);
    }

    // Caso 2: route con slug (tenant multi-utente)
    const tenantSlug = this.tenant.userSlug();
    if (tenantSlug) {
      return this.getBySlug(tenantSlug);
    }

    const urlSlug = this.peekSlugFromUrl();
    if (urlSlug) {
      return this.getBySlug(urlSlug);
    }

    // Caso 3: pagina principale senza slug
    return this.getDefaultProfile();
  }

  private getProfileByUserId(userId: number): Observable<PublicProfileDto> {
    const key = `u:${userId}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const stream = this.http.get<PublicProfileDto>(apiUrl(`users/${userId}/public-profile`)).pipe(
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

  /**
   * Carica il profilo default (senza slug)
   * Metodo pubblico per permettere il caricamento forzato del profilo principale
   */
  getDefaultProfile(): Observable<PublicProfileDto> {
    const key = 'root';
    const cached = this.cache.get(key);
    if (cached) return cached;

    const url = apiUrl('public-profile');
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
    // Normalizza lo slug in minuscolo per coerenza con il database
    const normalizedSlug = slug.toLowerCase();
    const key = `s:${normalizedSlug}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const stream = this.http.get<PublicProfileDto>(apiUrl(`${normalizedSlug}/public-profile`)).pipe(
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
    // Lista completa di tutte le route riservate (senza prefisso slug)
    const reserved = new Set([
      'about',
      'curriculum',
      'progetti',
      'attestati',
      'contatti',
      'job-offers',
      'nuova-recensione',
      'auth',
      'not-found',
      'profile-not-found'
    ]);
    return first && !reserved.has(first) ? first : null;
  }

  /**
   * Invalida la cache del profilo per forzare un nuovo caricamento
   */
  clearCache(): void {
    this.cache.clear();
  }
}