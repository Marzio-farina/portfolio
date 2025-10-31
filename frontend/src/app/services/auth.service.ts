import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';

import { apiUrl } from '../core/api/api-url';
import { TenantService } from './tenant.service';

// ========================================================================
// Interfaces
// ========================================================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PublicProfile {
  user: {
    id: number;
    name: string;
    email: string;
    title?: string | null;
    avatar_url?: string | null;
  } | null;
}

/**
 * Authentication Service
 * 
 * Manages user authentication state, token storage, and profile data.
 * Provides methods for login, registration, logout, and profile management.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);

  // ========================================================================
  // State Management
  // ========================================================================

  /** Authentication token signal */
  token = signal<string | null>(localStorage.getItem('auth_token'));

  /** Authenticated user ID - memorizzato quando si fa login */
  authenticatedUserId = signal<number | null>(null);

  /** Profile refresh subject for reactive updates */
  private readonly meRefresh$ = new ReplaySubject<void>(1);

  // ========================================================================
  // Public Properties
  // ========================================================================

  /**
   * User profile stream with caching
   * Returns authenticated user profile or public profile based on auth state
   */
  readonly me$ = this.meRefresh$.pipe(
    switchMap(() => {
      const slug = this.tenant.userSlug();
      const url = apiUrl(slug ? `/${slug}/public-profile` : '/public-profile');
      
      return this.http.get<PublicProfile>(url);
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    // All'avvio, se c'è un token, carica l'ID dell'utente autenticato
    const existingToken = this.token();
    if (existingToken) {
      this.loadAuthenticatedUserId();
    }
  }

  /**
   * Carica l'ID dell'utente autenticato dal backend
   */
  private loadAuthenticatedUserId(): void {
    this.http.get<{ id: number; email: string; name: string }>(apiUrl('/me')).subscribe({
      next: (user) => {
        this.authenticatedUserId.set(user.id);
      },
      error: () => {
        // Se il token non è valido, pulisci tutto
        this.setToken(null);
        this.authenticatedUserId.set(null);
      }
    });
  }

  // ========================================================================
  // Public Methods
  // ========================================================================

  /**
   * Check if user is authenticated
   * L'autenticazione è valida solo se:
   * - C'è un token valido E
   * - L'utente autenticato corrisponde al tenant corrente (se presente uno slug)
   * 
   * @returns True if user has valid token and matches current tenant
   */
  isAuthenticated(): boolean {
    const hasToken = !!this.token();
    if (!hasToken) return false;
    
    // Se non c'è uno slug utente nel tenant, l'autenticazione è valida (path generico)
    const tenantUserId = this.tenant.userId();
    if (!tenantUserId) {
      return true; // Autenticazione valida su path senza slug
    }
    
    // Se c'è uno slug utente, verifica che l'utente autenticato corrisponda
    const authUserId = this.authenticatedUserId();
    if (!authUserId) {
      // Se non abbiamo ancora caricato l'ID, considera autenticato (verrà verificato al primo accesso)
      return true;
    }
    
    // L'autenticazione è valida solo se l'utente autenticato corrisponde al tenant corrente
    return authUserId === tenantUserId;
  }

  /**
   * Refresh user profile data
   * Triggers a new profile fetch
   */
  refreshMe(): void {
    this.meRefresh$.next();
  }

  /**
   * Login user with credentials
   * 
   * @param dto Login credentials
   * @returns Observable of user profile after successful login
   */
  login(dto: LoginDto): Observable<PublicProfile> {
    return this.http.post<AuthResponse>(apiUrl('/login'), dto).pipe(
      switchMap(response => {
        this.setToken(response.token);
        // Memorizza l'ID dell'utente autenticato
        this.authenticatedUserId.set(response.user.id);
        this.refreshMe();
        return this.me$;
      })
    );
  }

  /**
   * Register new user
   * 
   * @param dto Registration data
   * @returns Observable of user profile after successful registration
   */
  register(dto: RegisterDto): Observable<PublicProfile> {
    // Sanitizza: invia solo i campi permessi, ignora eventuali extra (es. role_id)
    const payload: RegisterDto = {
      name: dto.name,
      email: dto.email,
      password: dto.password,
    };
    return this.http.post<AuthResponse>(apiUrl('/register'), payload).pipe(
      switchMap(response => {
        this.setToken(response.token);
        // Memorizza l'ID dell'utente autenticato
        this.authenticatedUserId.set(response.user.id);
        this.refreshMe();
        return this.me$;
      })
    );
  }

  /**
   * Request password reset
   * 
   * @param email User email address
   * @returns Observable of reset request response
   */
  forgotPassword(email: string): Observable<any> {
    return this.http.post(apiUrl('/auth/forgot-password'), { email });
  }

  /**
   * Reset user password with token
   * Validates the reset token and updates the user's password
   * 
   * @param email User email address
   * @param token Password reset token
   * @param password New password
   * @returns Observable of reset response
   */
  resetPassword(email: string, token: string, password: string): Observable<any> {
    return this.http.post(apiUrl('/auth/reset-password'), {
      email,
      token,
      password
    });
  }

  /**
   * Logout current user
   * Clears token and refreshes profile to public state
   */
  logout(): void {
    // Prova a revocare il token lato server (fire-and-forget)
    try {
      if (this.token()) {
        this.http.post(apiUrl('/logout'), {}).subscribe({
          complete: () => {},
          error: () => {}
        });
      }
    } catch {}

    // Pulisci comunque lo stato locale
    this.setToken(null);
    this.authenticatedUserId.set(null);
    this.refreshMe();
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Set authentication token
   * Updates token signal and localStorage
   * 
   * @param token Authentication token or null to clear
   */
  private setToken(token: string | null): void {
    this.token.set(token);
    
    if (token) {
      localStorage.setItem('auth_token', token);
      // Carica l'ID dell'utente autenticato quando si imposta un nuovo token
      this.loadAuthenticatedUserId();
    } else {
      localStorage.removeItem('auth_token');
      this.authenticatedUserId.set(null);
    }
  }
}