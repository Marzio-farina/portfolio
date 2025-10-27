import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';

import { apiUrl } from '../core/api/api-url';

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

  // ========================================================================
  // State Management
  // ========================================================================

  /** Authentication token signal */
  token = signal<string | null>(localStorage.getItem('auth_token'));

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
      const url = this.isAuthenticated() 
        ? apiUrl('/me') 
        : apiUrl('/public-profile');
      
      return this.http.get<PublicProfile>(url);
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.refreshMe();
  }

  // ========================================================================
  // Public Methods
  // ========================================================================

  /**
   * Check if user is authenticated
   * 
   * @returns True if user has valid token
   */
  isAuthenticated(): boolean {
    return !!this.token();
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
   * Logout current user
   * Clears token and refreshes profile to public state
   */
  logout(): void {
    // Prova a revocare il token lato server (fire-and-forget)
    try {
      if (this.isAuthenticated()) {
        this.http.post(apiUrl('/logout'), {}).subscribe({
          complete: () => {},
          error: () => {}
        });
      }
    } catch {}

    // Pulisci comunque lo stato locale
    this.setToken(null);
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
    } else {
      localStorage.removeItem('auth_token');
    }
  }
}