import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
// Se già usi questo helper altrove, il path giusto dal folder /services è questo:
import { apiUrl } from '../core/api/api-url';

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
  phone: string | null;
  location: string | null;

  // date
  date_of_birth: string | null;     // "YYYY-MM-DD"
  date_of_birth_it: string | null;  // "dd/mm/YYYY"
  age: number | null;

  socials: SocialLink[];
}

@Injectable({ providedIn: 'root' })
export class AboutProfileService {
  private readonly http = inject(HttpClient);

  /**
   * Restituisce il profilo pubblico per l'Aside (nome, cognome, email, phone,
   * location, compleanno, socials).
   *
   * Dev:  http://localhost:8000/api/public-profile
   * Prod: https://api.marziofarina.it/api/api/public-profile
   */
  get$(): Observable<PublicProfileDto> {
    return this.http.get<PublicProfileDto>(apiUrl('public-profile')).pipe(
      // opzionale: normalizzo i provider in lowercase
      map(res => ({
        ...res,
        socials: (res.socials ?? []).map(s => ({
          ...s,
          provider: (s.provider ?? '').toLowerCase()
        }))
      }))
    );
  }
}