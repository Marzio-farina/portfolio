import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Aside } from './components/aside/aside';
import { Dashboard } from './components/dashboard/dashboard';
import { Navbar } from './components/navbar/navbar';
import { Auth } from './components/auth/auth';
import { AuthService } from './services/auth.service';
import { IdleService } from './services/idle.service';
import { ThemeService } from './services/theme.service';

/**
 * Main Application Component
 * 
 * Root component of the portfolio application that manages
 * the overall layout, authentication state, and idle timeout handling.
 */
@Component({
  selector: 'app-root',
  imports: [Aside, Navbar, Dashboard, Auth],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // ========================================================================
  // Properties
  // ========================================================================

  /** Application title signal */
  protected readonly title = signal('Portfolio');

  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly auth = inject(AuthService);
  private readonly idle = inject(IdleService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Modal login
  isLoginOpen = signal(false);

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.initializeTheme();
    this.initializeIdleTimeout();
    this.setupAuthenticationEffect();
    this.setupIdleTimeoutHandler();
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Initialize theme based on browser preferences
   * Sets the theme to 'auto' by default to follow browser/system theme
   */
  private initializeTheme(): void {
    // Il ThemeService ora gestisce automaticamente la logica di inizializzazione
    // Non forziamo più il tema qui, lasciamo che il servizio decida
  }

  /**
   * Initialize idle timeout configuration
   * Sets the idle timeout to 15 minutes (900,000 ms)
   */
  private initializeIdleTimeout(): void {
    this.idle.configure(15 * 60 * 1000);
  }

  /**
   * Setup authentication effect to manage idle monitoring
   * Starts idle monitoring when user is authenticated,
   * stops when user logs out
   */
  private setupAuthenticationEffect(): void {
    effect(() => {
      const authed = this.auth.isAuthenticated();
      if (authed) {
        this.idle.start();
        // Chiudi automaticamente la modale login quando autenticato
        if (this.isLoginOpen()) {
          this.isLoginOpen.set(false);
        }
      } else {
        this.idle.stop();
      }
    });
  }

  /**
   * Setup idle timeout handler
   * Handles automatic logout when user becomes idle
   */
  private setupIdleTimeoutHandler(): void {
    this.idle.onTimeout$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.handleIdleTimeout();
      });
  }

  /**
   * Handle idle timeout event
   * Logs out user and redirects to auth page
   */
  private handleIdleTimeout(): void {
    this.auth.logout();
    this.isLoginOpen.set(true);
  }

  // Apertura/chiusura popup login
  openLogin(): void { this.isLoginOpen.set(true); }
  closeLogin(): void { this.isLoginOpen.set(false); }
}