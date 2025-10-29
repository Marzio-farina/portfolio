import { Component, DestroyRef, computed, effect, inject, signal, OnInit, ViewChild, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Aside } from './components/aside/aside';
import { Dashboard } from './components/dashboard/dashboard';
import { Navbar } from './components/navbar/navbar';
import { Auth } from './components/auth/auth';
import { AuthService } from './services/auth.service';
import { IdleService } from './services/idle.service';
import { ThemeService } from './services/theme.service';
import { ParticlesBgComponent } from './components/particles-bg/particles-bg';
import { CvUploadModalService } from './services/cv-upload-modal.service';
import { CvUploadModal } from './components/cv-upload-modal/cv-upload-modal';
import { filter, map } from 'rxjs/operators';

/**
 * Main Application Component
 * 
 * Root component of the portfolio application that manages
 * the overall layout, authentication state, and idle timeout handling.
 */
@Component({
  selector: 'app-root',
  imports: [Aside, Navbar, Dashboard, Auth, ParticlesBgComponent, CvUploadModal],
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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cvUploadModal = inject(CvUploadModalService);

  @ViewChild(Auth) authComponent?: Auth;

  // Modal login
  isLoginOpen = signal(false);
  isAuthed = computed(() => !!this.auth.token());
  
  // Modal CV upload (gestita dal servizio)
  isCvUploadModalOpen = this.cvUploadModal.isOpen;

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.initializeTheme();
    this.initializeIdleTimeout();
    this.setupAuthenticationEffect();
    this.setupIdleTimeoutHandler();
    this.checkPasswordResetParams();
  }

  /**
   * Verifica se ci sono parametri di reset password nell'URL
   * e apre automaticamente il dialog in modalità reset
   */
  private checkPasswordResetParams(): void {
    this.route.queryParams
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(params => params['token'] && params['email']),
        map(params => ({ token: params['token'], email: params['email'] }))
      )
      .subscribe(({ token, email }) => {
        // Apri il dialog
        this.isLoginOpen.set(true);
        // Usa setTimeout per assicurarsi che il componente sia renderizzato
        setTimeout(() => {
          if (this.authComponent) {
            this.authComponent.initializeResetPassword(email, token);
            // Rimuovi i parametri dall'URL dopo l'inizializzazione
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {},
              replaceUrl: true
            });
          }
        }, 100);
      });
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

  /**
   * Gestisce la pressione di Esc o Delete per chiudere il dialog di login
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Chiudi il dialog solo se è aperto e viene premuto Esc o Delete
    if (this.isLoginOpen() && (event.key === 'Escape' || event.key === 'Delete')) {
      this.closeLogin();
    }
  }

  // Gestione modal CV upload
  onCvUploaded(): void {
    this.cvUploadModal.notifyUploadCompleted();
    this.cvUploadModal.close();
  }

  onCvUploadCancelled(): void {
    this.cvUploadModal.close();
  }

  // Click sul pulsante in alto a destra: Accedi/Logout dinamico
  onAuthButtonClick(): void {
    if (this.isAuthed()) {
      this.auth.logout();
      this.isLoginOpen.set(false);
    } else {
      this.openLogin();
    }
  }
}