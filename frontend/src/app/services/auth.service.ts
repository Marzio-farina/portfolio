import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { shareReplay, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { apiUrl } from '../core/api/api-url';
import { TenantService } from './tenant.service';
import { TenantRouterService } from './tenant-router.service';
import { EditModeService } from './edit-mode.service';
import { LoggerService } from '../core/logger.service';

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
    slug?: string;
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
  private readonly tenantRouter = inject(TenantRouterService);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);
  private readonly editMode = inject(EditModeService);

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
      try {
        const slug = this.tenant.userSlug();
        const url = apiUrl(slug ? `/${slug}/public-profile` : '/public-profile');
        
        // Defensive: verifica che l'URL sia valido
        if (!url) {
          this.logger.error('Invalid profile URL', { slug });
          return of({ user: null } as PublicProfile);
        }
        
        return this.http.get<PublicProfile>(url).pipe(
          catchError(error => {
            this.logger.error('Failed to load user profile', error);
            return of({ user: null } as PublicProfile);
          })
        );
      } catch (error) {
        this.logger.error('Error in profile stream', error);
        return of({ user: null } as PublicProfile);
      }
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
    const url = apiUrl('/me');
    
    // Defensive: verifica URL valido
    if (!url) {
      this.logger.error('Invalid /me endpoint URL');
      return;
    }

    this.http.get<{ id: number; email: string; name: string }>(url).subscribe({
      next: (user) => {
        // Defensive: verifica che l'utente abbia un ID valido
        if (!user || !user.id || typeof user.id !== 'number') {
          this.logger.warn('Invalid user data received', { user });
          return;
        }
        
        this.authenticatedUserId.set(user.id);
        // Notifica EditModeService dell'ID utente autenticato
        this.editMode.setAuthenticatedUserId(user.id);
      },
      error: (err: HttpErrorResponse | any) => {
        // Fa logout SOLO se il token non è valido (401)
        // Non fare logout per errori temporanei di rete o timeout
        const status = err?.status || err?.originalError?.status;
        
        if (status === 401) {
          this.logger.warn('Token invalid (401), logging out');
          this.setToken(null);
          this.authenticatedUserId.set(null);
          this.editMode.setAuthenticatedUserId(null);
        } else {
          this.logger.error('Failed to load authenticated user ID', err, {
            status,
            keepToken: true
          });
        }
        // Per altri errori (timeout, rete, 500, ecc.) mantieni il token
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
    try {
      const hasToken = !!this.token();
      
      // Early return: nessun token
      if (!hasToken) {
        return false;
      }
      
      // Se non c'è uno slug utente nel tenant, l'autenticazione è valida (path generico)
      const tenantUserId = this.tenant?.userId();
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
      
    } catch (error) {
      this.logger.error('Error checking authentication status', error);
      return false; // In caso di errore, considera non autenticato per sicurezza
    }
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
        this.editMode.setAuthenticatedUserId(response.user.id);
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
        this.editMode.setAuthenticatedUserId(response.user.id);
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
   * Disables edit mode and redirects to /about if on protected route with notification
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

    // La modalità edit si disabiliterà automaticamente tramite l'effect in EditModeService
    // quando cambia l'utente autenticato o il tenant

    // Controlla se l'utente è su una rotta protetta (che richiede auth)
    const currentUrl = this.router.url;
    const protectedRoutes = [
      '/job-offers',
      '/attestati/nuovo',
      '/progetti/nuovo'
    ];
    
    const isOnProtectedRoute = protectedRoutes.some(route => currentUrl.includes(route));

    // Pulisci comunque lo stato locale
    this.setToken(null);
    this.authenticatedUserId.set(null);
    this.editMode.setAuthenticatedUserId(null);
    this.refreshMe();

    // Se era su una rotta protetta, reindirizza a /about con notifica
    if (isOnProtectedRoute) {
      this.tenantRouter.navigate(['about'], {
        state: {
          toast: {
            message: 'Sessione terminata. Accedi nuovamente per continuare.',
            type: 'info'
          }
        }
      });
    }
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
      this.editMode.setAuthenticatedUserId(null);
    }
  }
}