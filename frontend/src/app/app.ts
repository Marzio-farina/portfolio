import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Aside } from './components/aside/aside';
import { Dashboard } from './components/dashboard/dashboard';
import { Navbar } from './components/navbar/navbar';
import { AuthService } from './services/auth.service';
import { IdleService } from './services/idle.service';

/**
 * Main Application Component
 * 
 * Root component of the portfolio application that manages
 * the overall layout, authentication state, and idle timeout handling.
 */
@Component({
  selector: 'app-root',
  imports: [Aside, Navbar, Dashboard],
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.initializeIdleTimeout();
    this.setupAuthenticationEffect();
    this.setupIdleTimeoutHandler();
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

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
      if (this.auth.isAuthenticated()) {
        this.idle.start();
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
    this.router.navigateByUrl('/accedi');
    console.warn('Session expired due to inactivity.');
  }
}