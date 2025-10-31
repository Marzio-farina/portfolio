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
 
import { AttestatoDetailModalService } from './services/attestato-detail-modal.service';
import { AttestatoDetailModal } from './components/attestato-detail-modal/attestato-detail-modal';
import { ProjectDetailModalService } from './services/project-detail-modal.service';
import { ProjectDetailModal } from './components/project-detail-modal/project-detail-modal';
import { Notification, NotificationItem, NotificationType } from './components/notification/notification';
import { CvPreviewModalService } from './services/cv-preview-modal.service';
import { CvPreviewModal } from './components/cv-preview-modal/cv-preview-modal';
import { filter, map } from 'rxjs/operators';

/**
 * Main Application Component
 * 
 * Root component of the portfolio application that manages
 * the overall layout, authentication state, and idle timeout handling.
 */
@Component({
  selector: 'app-root',
  imports: [Aside, Navbar, Dashboard, Auth, ParticlesBgComponent, CvUploadModal, AttestatoDetailModal, ProjectDetailModal, CvPreviewModal, Notification],
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
  private readonly attestatoDetailModal = inject(AttestatoDetailModalService);
  private readonly projectDetailModal = inject(ProjectDetailModalService);
  private readonly cvPreviewModal = inject(CvPreviewModalService);

  @ViewChild(Auth) authComponent?: Auth;

  // Modal login
  isLoginOpen = signal(false);
  isAuthed = computed(() => !!this.auth.token());
  
  // Modal CV upload (gestita dal servizio)
  isCvUploadModalOpen = this.cvUploadModal.isOpen;

  

  // Modal Attestato Detail (gestita dal servizio)
  isAttestatoDetailModalOpen = this.attestatoDetailModal.isOpen;
  selectedAttestato = this.attestatoDetailModal.selectedAttestato;

  // Modal Project Detail (gestita dal servizio)
  isProjectDetailModalOpen = this.projectDetailModal.isOpen;
  selectedProject = this.projectDetailModal.selectedProject;

  // Modal CV Preview (gestita dal servizio)
  isCvPreviewModalOpen = this.cvPreviewModal.isOpen;

  // Notifiche globali (per logout automatico)
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = signal(false);

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.initializeTheme();
    this.initializeIdleTimeout();
    this.setupAuthenticationEffect();
    this.setupIdleTimeoutHandler();
    this.checkPasswordResetParams();
    
    // Blocca lo scroll del body quando qualsiasi modale è aperto
    effect(() => {
      const isModalOpen = this.isAttestatoDetailModalOpen() || this.isProjectDetailModalOpen() || this.isLoginOpen() || this.isCvUploadModalOpen() || this.isCvPreviewModalOpen();
      if (isModalOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
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
   * Sets the idle timeout to 15 seconds (15,000 ms) for testing
   * TODO: Cambiare a 15 minuti (15 * 60 * 1000) in produzione
   */
  private initializeIdleTimeout(): void {
    // Imposta il timeout di inattività a 30 minuti
    this.idle.configure(30 * 60 * 1000);
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
    // Aggiungi notifica di logout per inattività
    this.addNotification('Sei stato disconnesso per inattività.', 'warning');
    
    this.auth.logout();
    this.isLoginOpen.set(true);
  }

  /**
   * Aggiunge una notifica globale
   */
  private addNotification(message: string, type: NotificationType): void {
    const notification: NotificationItem = {
      id: `global-${Date.now()}`,
      message,
      type,
      timestamp: Date.now(),
      fieldId: 'global'
    };
    
    this.notifications.update(list => [...list, notification]);
    this.showMultipleNotifications.set(true);

    // Rimuovi automaticamente la notifica dopo 5 secondi
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }

  /**
   * Rimuove una notifica per ID
   */
  private removeNotification(id: string): void {
    this.notifications.update(list => {
      const filtered = list.filter(n => n.id !== id);
      if (filtered.length === 0) {
        this.showMultipleNotifications.set(false);
      }
      return filtered;
    });
  }

  /**
   * Ottiene la notifica più grave (per il componente Notification)
   */
  getMostSevereNotification(): NotificationItem | null {
    const list = this.notifications();
    if (!list.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }

  // Apertura/chiusura popup login
  openLogin(): void { this.isLoginOpen.set(true); }
  closeLogin(): void { this.isLoginOpen.set(false); }

  /**
   * Gestisce la pressione di Esc o Delete per chiudere i dialog aperti
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Delete') {
      // Chiudi il dialog di login se aperto
      if (this.isLoginOpen()) {
        this.closeLogin();
      }
      // Chiudi il dialog di dettaglio attestato se aperto
      if (this.isAttestatoDetailModalOpen()) {
        this.onAttestatoDetailClosed();
      }

      // Chiudi il dialog di dettaglio progetto se aperto
      if (this.isProjectDetailModalOpen()) {
        this.onProjectDetailClosed();
      }
      
      // Chiudi il dialog di CV upload se aperto
      if (this.isCvUploadModalOpen()) {
        this.onCvUploadCancelled();
      }
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

  

  // Gestione modal Attestato Detail
  onAttestatoDetailClosed(): void {
    this.attestatoDetailModal.close();
  }

  // Gestione modal Project Detail
  onProjectDetailClosed(): void {
    this.projectDetailModal.close();
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