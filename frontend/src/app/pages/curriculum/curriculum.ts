import { Component, DestroyRef, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ResumeSection } from '../../components/resume-section/resume-section';
import { Skills } from '../../components/skills/skills';
import { CvService } from '../../services/cv.service';
import { CvFileService } from '../../services/cv-file.service';
import { Notification, NotificationType } from '../../components/notification/notification';
import { AuthService } from '../../services/auth.service';
import { CvUploadModalService } from '../../services/cv-upload-modal.service';

type TimelineItem = { title: string; years: string; description: string };

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  fieldId: string;
}

@Component({
  selector: 'app-curriculum',
  imports: [
    ResumeSection,
    Skills,
    Notification
  ],
  templateUrl: './curriculum.html',
  styleUrl: './curriculum.css'
})
export class Curriculum {
  private route = inject(ActivatedRoute);
  private cv = inject(CvService);
  private cvFile = inject(CvFileService);
  private auth = inject(AuthService);
  private cvUploadModal = inject(CvUploadModalService);
  private destroyRef = inject(DestroyRef);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  education = signal<TimelineItem[]>([]);
  experience = signal<TimelineItem[]>([]);
  loading = signal(true);
  cvMenuOpen = signal(false);
  downloading = signal(false);
  
  // Gestione notifiche multiple
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = signal(false);

  constructor() {
    this.cv.get$().subscribe({
      next: data => {
        this.education.set(data.education);
        this.experience.set(data.experience);
        this.loading.set(false);
      },
      error: (err: any) => {
        const message = this.getErrorMessage(err) || 'Impossibile caricare il curriculum.';
        this.addNotification('error', message, 'cv-load');
        this.loading.set(false);
      }
    });

    // Ascolta quando l'upload CV è completato
    this.cvUploadModal.onUploadCompleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.onCvUploaded();
      });
  }

  /**
   * Scarica il CV PDF di default
   */
  downloadPdf(): void {
    if (this.downloading()) {
      return;
    }

    this.downloading.set(true);
    this.cvFile.getDefault$().subscribe({
      next: (response) => {
        if (response.success && response.cv?.download_url) {
          this.cvFile.downloadFile(response.cv.download_url);
          this.addNotification('success', 'Download del CV avviato.', 'cv-download');
        } else {
          const message = response.message || 'Nessun CV disponibile per il download.';
          this.addNotification('error', message, 'cv-download');
        }
        this.downloading.set(false);
      },
      error: (err: any) => {
        const message = this.getErrorMessage(err) || 'Errore durante il download del CV.';
        this.addNotification('error', message, 'cv-download');
        this.downloading.set(false);
      }
    });
  }

  /**
   * Apre il CV online (stesso URL del download, ma in una nuova tab)
   */
  openOnline(): void {
    this.cvFile.getDefault$().subscribe({
      next: (response) => {
        if (response.success && response.cv?.download_url) {
          window.open(response.cv.download_url, '_blank');
        } else {
          const message = response.message || 'Nessun CV disponibile.';
          this.addNotification('error', message, 'cv-open');
        }
      },
      error: (err: any) => {
        const message = this.getErrorMessage(err) || 'Errore durante l\'apertura del CV.';
        this.addNotification('error', message, 'cv-open');
      }
    });
  }

  /**
   * Condivide il link del CV (Web Share API se disponibile, altrimenti copia URL)
   */
  async share(): Promise<void> {
    try {
      this.cvFile.getDefault$().subscribe({
        next: async (response) => {
          if (response.success && response.cv?.download_url) {
            const url = response.cv.download_url;

            // Prova Web Share API
            if (navigator.share) {
              try {
                await navigator.share({
                  title: 'Il mio Curriculum',
                  text: 'Visualizza il mio curriculum',
                  url: url
                });
                return;
              } catch (err) {
                // L'utente ha annullato o errore, fallback al copy
              }
            }

            // Fallback: copia URL negli appunti
            try {
              await navigator.clipboard.writeText(url);
              this.addNotification('success', 'Link del CV copiato negli appunti!', 'cv-share');
            } catch (err) {
              this.addNotification('error', 'Impossibile copiare il link.', 'cv-share');
            }
          } else {
            const message = response.message || 'Nessun CV disponibile.';
            this.addNotification('error', message, 'cv-share');
          }
        },
        error: (err: any) => {
          const message = this.getErrorMessage(err) || 'Errore durante la condivisione del CV.';
          this.addNotification('error', message, 'cv-share');
        }
      });
    } catch (err) {
      this.addNotification('error', 'Funzionalità di condivisione non disponibile.', 'cv-share');
    }
  }

  /**
   * Gestisce il click sul bottone CV
   * Se l'utente è autenticato e non esiste un CV, apre la modal di upload
   * Altrimenti apre il menu normale
   */
  onCvButtonClick(): void {
    // Se l'utente non è autenticato, apri il menu normalmente
    if (!this.auth.isAuthenticated()) {
      this.cvMenuOpen.set(!this.cvMenuOpen());
      return;
    }

    // Se l'utente è autenticato, controlla se esiste un CV
    this.cvFile.getDefault$().pipe(
      catchError((err: any) => {
        // Se è un 404 (CV non trovato), è normale per utenti senza CV - apri modal silenziosamente
        // L'interceptor wrappa l'errore, controlla sia originalError che status diretto
        const status = err?.originalError?.status ?? err?.status ?? err?.statusCode;
        
        if (status === 404) {
          // Ritorna un oggetto che simula una risposta senza CV
          return of({ success: false, message: 'Nessun CV trovato', cv: undefined });
        }
        
        // Per altri errori, rilancia l'errore
        throw err;
      })
    ).subscribe({
      next: (response) => {
        if (response.success && response.cv) {
          // CV esiste, apri il menu
          this.cvMenuOpen.set(!this.cvMenuOpen());
        } else {
          // CV non esiste, apri la modal di upload
          // Mostra una notifica informativa
          this.addNotification('info', 'Nessun CV trovato. Carica il tuo curriculum.', 'cv-not-found');
          // Apri la modal usando il servizio
          this.cvUploadModal.open();
        }
      },
      error: (err: any) => {
        // Gestisci solo errori non-404 qui
        // Anche qui, se è un 404 che è sfuggito, apri la modal
        const status = err?.originalError?.status ?? err?.status ?? err?.statusCode;
        if (status === 404) {
          // CV non trovato - mostra notifica informativa e apri modal
          this.addNotification('info', 'Nessun CV trovato. Carica il tuo curriculum.', 'cv-not-found');
          // Apri la modal usando il servizio
          this.cvUploadModal.open();
        } else {
          this.cvMenuOpen.set(!this.cvMenuOpen());
          const message = this.getErrorMessage(err) || 'Errore durante il caricamento del CV.';
          this.addNotification('error', message, 'cv-check');
        }
      }
    });
  }

  /**
   * Gestisce l'upload completato del CV (chiamato dall'App component)
   * Questo metodo viene chiamato dall'event emitter del componente modal
   */
  onCvUploaded(): void {
    this.addNotification('success', 'CV caricato con successo!', 'cv-upload');
    // Chiudi il menu se era aperto
    this.cvMenuOpen.set(false);
  }

  /**
   * Aggiunge una notifica alla lista
   */
  private addNotification(type: NotificationType, message: string, fieldId: string): void {
    const currentNotifications = this.notifications();
    
    // Controlla se esiste già una notifica con lo stesso messaggio e fieldId
    const duplicate = currentNotifications.some(n => n.message === message && n.fieldId === fieldId);
    
    if (!duplicate) {
      const newNotification: NotificationItem = {
        id: `${fieldId}-${Date.now()}`,
        message: message,
        type: type,
        timestamp: Date.now(),
        fieldId: fieldId
      };
      
      // Rimuovi eventuali notifiche precedenti per lo stesso campo
      const filteredNotifications = currentNotifications.filter(n => n.fieldId !== fieldId);
      
      // Aggiungi la nuova notifica
      this.notifications.set([...filteredNotifications, newNotification]);
      this.showMultipleNotifications.set(true);
    }
  }

  /**
   * Ottiene la notifica più grave per l'icona nell'angolo
   */
  getMostSevereNotification(): NotificationItem | null {
    const currentNotifications = this.notifications();
    if (currentNotifications.length === 0) return null;
    
    // Scala di gravità: Error > Warning > Info > Success
    const severityOrder = { 'error': 0, 'warning': 1, 'info': 2, 'success': 3 };
    
    return currentNotifications.reduce((mostSevere, current) => {
      if (severityOrder[current.type] < severityOrder[mostSevere.type]) {
        return current;
      }
      return mostSevere;
    });
  }

  /**
   * Estrae il messaggio di errore dall'oggetto errore
   */
  private getErrorMessage(err: any): string | null {
    // Prova prima di estrarre dal payload (risposta JSON del backend)
    if (err?.payload?.message) {
      return err.payload.message;
    }
    // Se il payload è una stringa
    if (typeof err?.payload === 'string') {
      return err.payload;
    }
    // Prova dall'errore originale (HttpErrorResponse)
    if (err?.originalError?.error?.message) {
      return err.originalError.error.message;
    }
    if (typeof err?.originalError?.error === 'string') {
      return err.originalError.error;
    }
    // Prova dal messaggio dell'errore stesso
    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    // Nessun messaggio disponibile
    return null;
  }
}
