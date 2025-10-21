import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { shareReplay, switchMap, tap } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { apiUrl } from '../core/api/api-url';
import { CACHE_TTL } from '../core/api-cache.interceptor';

export interface LoginDto { email: string; password: string; }
export interface RegisterDto { name: string; email: string; password: string; }
export interface AuthResponse { token: string; user: { id: number; name: string; email: string; }; }

export interface PublicProfile {
  user: {
    id: number;
    name: string;
    title?: string | null;
    avatar_url?: string | null;
    // ... aggiungi campi esposti dalla tua Resource se vuoi
  } | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // stato token + isAuthenticated
  token = signal<string | null>(localStorage.getItem('auth_token'));
  isAuthenticated() { return !!this.token(); }

  private setToken(t: string | null) {
    this.token.set(t);
    if (t) localStorage.setItem('auth_token', t);
    else   localStorage.removeItem('auth_token');
  }

  // ---- STREAM me$ cacheato (shareReplay 1)
  private meRefresh$ = new ReplaySubject<void>(1);

  /** 
   * Stream del profilo utente:
   * - se autenticato → /api/me (richiede Authorization)
   * - altrimenti → /api/public-profile (pubblico)
   * Passa dal tuo ApiCacheInterceptor: TTL custom 60s (modifica a piacere).
   */
  readonly me$ = this.meRefresh$.pipe(
    switchMap(() => {
      const url = this.isAuthenticated() ? apiUrl('/me') : apiUrl('/public-profile');
      return this.http.get<PublicProfile | any>(url, {
        context: new HttpContext()
          .set(CACHE_TTL, 60_000) // TTL 60s per questo endpoint; cambia o rimuovi se preferisci
          // .set(CACHE_BYPASS, true) // usa questo per forzare fetch ignorando cache quando serve
      });
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  constructor() {
    // primo load
    this.refreshMe();
  }

  /** Forza un refresh dello stream me$ (ri-lancia GET al prossimo subscribe già attivo) */
  refreshMe() { this.meRefresh$.next(); }

  // ---- Auth API ----

  login(dto: LoginDto) {
    return this.http.post<AuthResponse>(apiUrl('/login'), dto).pipe(
      switchMap(res => {
        this.setToken(res.token);
        // dopo login → aggiorna subito me$
        this.refreshMe();
        // ritorna anche il payload se serve
        return this.me$;
      })
    );
  }

  register(dto: RegisterDto) {
    return this.http.post<AuthResponse>(apiUrl('/register'), dto).pipe(
      switchMap(res => {
        this.setToken(res.token);
        this.refreshMe();
        return this.me$;
      })
    );
  }

  forgotPassword(email: string) {
    return this.http.post(apiUrl('/auth/forgot-password'), { email });
  }

  logout() {
    this.setToken(null);
    // opzionale: colpisci anche /logout sul backend se vuoi invalidare
    // this.http.post(apiUrl('/logout'), {}).subscribe({error:()=>{},complete:()=>{}});
    this.refreshMe(); // passa a profilo pubblico
  }
}