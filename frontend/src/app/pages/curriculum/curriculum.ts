import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ResumeSection, NewCvItem } from '../../components/resume-section/resume-section';
import { SkillsSectionComponent } from '../../components/skills/skills';
import { CvService } from '../../services/cv.service';
import { TenantService } from '../../services/tenant.service';
import { CvFileService } from '../../services/cv-file.service';
import { Notification, NotificationType } from '../../components/notification/notification';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { CvUploadModalService } from '../../services/cv-upload-modal.service';
import { CvPreviewModalService } from '../../services/cv-preview-modal.service';
import { NotificationService } from '../../services/notification.service';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../core/api/api-url';

type TimelineItem = { title: string; years: string; description: string };

@Component({
  selector: 'app-curriculum',
  imports: [
    ResumeSection,
    SkillsSectionComponent,
    Notification
  ],
  providers: [NotificationService],
  templateUrl: './curriculum.html',
  styleUrl: './curriculum.css'
})
export class Curriculum {
  private route = inject(ActivatedRoute);
  private cv = inject(CvService);
  private tenant = inject(TenantService);
  private cvFile = inject(CvFileService);
  private auth = inject(AuthService);
  private edit = inject(EditModeService);
  private cvUploadModal = inject(CvUploadModalService);
  private cvPreviewModal = inject(CvPreviewModalService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  protected notificationService = inject(NotificationService);
  
  // Permette editing solo se autenticato e in edit mode
  canEdit = computed(() => this.auth.isAuthenticated() && this.edit.isEditing());

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  education = signal<TimelineItem[]>([]);
  experience = signal<TimelineItem[]>([]);
  loading = signal(true);
  cvMenuOpen = signal(false);
  downloading = signal(false);
  pdfDialogOpen = signal(false);
  pdfUrl = signal<string | null>(null);
  safePdfUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.pdfUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  constructor() {
    const uid = this.tenant.userId();
    this.cv.get$(uid ?? undefined).subscribe({
      next: data => {
        this.education.set(data.education);
        this.experience.set(data.experience);
        this.loading.set(false);
      },
      error: (err: any) => {
        const message = this.getErrorMessage(err) || 'Impossibile caricare il curriculum.';
        this.notificationService.add('error', message, 'cv-load');
        this.loading.set(false);
      }
    });

    // Ascolta quando l'upload CV è completato
    this.cvUploadModal.onUploadCompleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.onCvUploaded();
      });

    // Ricarica il CV quando cambia tenant
    const t = this.tenant;
    queueMicrotask(() => {
      const effectRef = (window as any).ngEffect?.(() => {
        void t.userId();
        const uid2 = t.userId();
        this.cv.get$(uid2 ?? undefined).subscribe({
          next: data => { this.education.set(data.education); this.experience.set(data.experience); this.loading.set(false); },
          error: () => { this.loading.set(false); }
        });
      });
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
    const uid = this.tenant.userId();
    this.cvFile.getDefault$(uid ?? undefined).subscribe({
      next: (response) => {
        if (response.success && response.cv?.download_url) {
          this.cvFile.downloadFile(response.cv.download_url);
          this.notificationService.add('success', 'Download del CV avviato.', 'cv-download');
        } else {
          const message = response.message || 'Nessun CV disponibile per il download.';
          this.notificationService.add('error', message, 'cv-download');
        }
        this.downloading.set(false);
      },
      error: (err: any) => {
        const message = this.getErrorMessage(err) || 'Errore durante il download del CV.';
        this.notificationService.add('error', message, 'cv-download');
        this.downloading.set(false);
      }
    });
  }

  /**
   * Apre il CV online (stesso URL del download, ma in una nuova tab)
   */
  openOnline(): void {
    const uid = this.tenant.userId();
    this.cvFile.getDefault$(uid ?? undefined).subscribe({
      next: (response) => {
        if (response.success && (response.cv?.view_url || response.cv?.download_url)) {
          const url = response.cv.view_url || response.cv.download_url;
          this.cvPreviewModal.open(url);
        } else {
          const message = response.message || 'Nessun CV disponibile.';
          this.notificationService.add('error', message, 'cv-open');
        }
      },
      error: (err: any) => {
        const message = this.getErrorMessage(err) || 'Errore durante l\'apertura del CV.';
        this.notificationService.add('error', message, 'cv-open');
      }
    });
  }

  closePdfDialog(): void {
    this.pdfDialogOpen.set(false);
    this.pdfUrl.set(null);
  }

  /**
   * Condivide il link del CV (Web Share API se disponibile, altrimenti copia URL)
   */
  async share(): Promise<void> {
    try {
      const uid = this.tenant.userId();
      this.cvFile.getDefault$(uid ?? undefined).subscribe({
        next: async (response) => {
          if (response.success && (response.cv?.view_url || response.cv?.download_url)) {
            const url = response.cv.view_url || response.cv.download_url;

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
              this.notificationService.add('success', 'Link del CV copiato negli appunti!', 'cv-share');
            } catch (err) {
              this.notificationService.add('error', 'Impossibile copiare il link.', 'cv-share');
            }
          } else {
            const message = response.message || 'Nessun CV disponibile.';
            this.notificationService.add('error', message, 'cv-share');
          }
        },
        error: (err: any) => {
          const message = this.getErrorMessage(err) || 'Errore durante la condivisione del CV.';
          this.notificationService.add('error', message, 'cv-share');
        }
      });
    } catch (err) {
      this.notificationService.add('error', 'Funzionalità di condivisione non disponibile.', 'cv-share');
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
    const uid = this.tenant.userId();
    this.cvFile.getDefault$(uid ?? undefined).pipe(
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
          this.notificationService.add('info', 'Nessun CV trovato. Carica il tuo curriculum.', 'cv-not-found');
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
          this.notificationService.add('info', 'Nessun CV trovato. Carica il tuo curriculum.', 'cv-not-found');
          // Apri la modal usando il servizio
          this.cvUploadModal.open();
        } else {
          this.cvMenuOpen.set(!this.cvMenuOpen());
          const message = this.getErrorMessage(err) || 'Errore durante il caricamento del CV.';
          this.notificationService.add('error', message, 'cv-check');
        }
      }
    });
  }

  /**
   * Gestisce l'upload completato del CV (chiamato dall'App component)
   * Questo metodo viene chiamato dall'event emitter del componente modal
   */
  onCvUploaded(): void {
    this.notificationService.add('success', 'CV caricato con successo!', 'cv-upload');
    // Chiudi il menu se era aperto
    this.cvMenuOpen.set(false);
  }

  /**
   * Ottiene la notifica più grave per l'icona nell'angolo
   */
  getMostSevereNotification() {
    return this.notificationService.getMostSevere();
  }
  
  /**
   * Gestisce l'eliminazione di un elemento CV con optimistic update
   */
  onDeleteCvItem(item: { title: string; years: string; type: 'education' | 'experience' }): void {
    // 🚀 OPTIMISTIC DELETE: Rimuovi subito dalla lista
    const removedItem = item.type === 'education' 
      ? this.education().find(i => i.title === item.title && i.years === item.years)
      : this.experience().find(i => i.title === item.title && i.years === item.years);
    
    if (!removedItem) return;
    
    if (item.type === 'education') {
      this.education.update(items => items.filter(i => i !== removedItem));
    } else {
      this.experience.update(items => items.filter(i => i !== removedItem));
    }
    
    // Invia richiesta DELETE al backend
    // Usa title e years come identificatori (il backend cercherà l'elemento corrispondente)
    const params = {
      type: item.type,
      title: item.title,
      years: item.years
    };
    
    this.http.delete(apiUrl('cv'), { params }).subscribe({
      next: () => {
        this.notificationService.add('success', 'Elemento eliminato con successo', 'cv-delete');
        
        // 🔄 Ricarica i dati dal backend per sincronizzare (esclude soft-deleted)
        const uid = this.tenant.userId();
        this.cv.get$(uid ?? undefined).subscribe({
          next: data => {
            this.education.set(data.education);
            this.experience.set(data.experience);
          }
        });
      },
      error: (err) => {
        // ⚠️ ROLLBACK: Ripristina l'elemento eliminato
        if (removedItem) {
          if (item.type === 'education') {
            this.education.update(items => [...items, removedItem]);
          } else {
            this.experience.update(items => [...items, removedItem]);
          }
        }
        
        const message = err?.error?.message || 'Errore durante l\'eliminazione';
        this.notificationService.add('error', message, 'cv-delete');
      }
    });
  }
  
  /**
   * Gestisce l'aggiunta di un nuovo elemento CV (education o experience)
   * Usa optimistic update per mostrare subito il risultato
   */
  onAddCvItem(item: NewCvItem): void {
    // Formatta le date per la visualizzazione
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    
    const startFormatted = formatDate(item.startDate);
    const endFormatted = item.endDate ? formatDate(item.endDate) : 'In Corso';
    const years = `${startFormatted} — ${endFormatted}`;
    
    // Crea l'elemento ottimistico per la UI
    const optimisticItem: TimelineItem = {
      title: item.title,
      years: years,
      description: item.description || ''
    };
    
    // 🚀 OPTIMISTIC UPDATE
    const position = item.insertPosition ?? 0;
    let removedItem: TimelineItem | null = null; // Per rollback in caso di errore
    
    if (item.isEdit && item.originalItem) {
      // MODIFICA: Sostituisci il record esistente
      if (item.type === 'education') {
        this.education.update(items => {
          const newItems = [...items];
          const oldIndex = newItems.findIndex(i => i.title === item.originalItem!.title && i.years === item.originalItem!.years);
          if (oldIndex >= 0) {
            removedItem = newItems[oldIndex];
            newItems[oldIndex] = optimisticItem;
          }
          return newItems;
        });
      } else {
        this.experience.update(items => {
          const newItems = [...items];
          const oldIndex = newItems.findIndex(i => i.title === item.originalItem!.title && i.years === item.originalItem!.years);
          if (oldIndex >= 0) {
            removedItem = newItems[oldIndex];
            newItems[oldIndex] = optimisticItem;
          }
          return newItems;
        });
      }
    } else {
      // NUOVO: Aggiungi nella posizione specificata
      if (item.type === 'education') {
        this.education.update(items => {
          const newItems = [...items];
          newItems.splice(position, 0, optimisticItem);
          return newItems;
        });
      } else {
        this.experience.update(items => {
          const newItems = [...items];
          newItems.splice(position, 0, optimisticItem);
          return newItems;
        });
      }
    }
    
    // Invia al backend
    if (item.isEdit && item.originalItem) {
      // MODIFICA: Aggiorna il record esistente
      const payload = {
        type: item.type,
        original_title: item.originalItem.title,
        original_years: item.originalItem.years,
        title: item.title,
        time_start: item.startDate,
        time_end: item.endDate,
        description: item.description
      };
      
      this.http.patch(apiUrl('cv'), payload).subscribe({
        next: () => {
          this.notificationService.add('success', 'Elemento modificato con successo', 'cv-edit');
          
          // Ricarica dal backend per avere i dati aggiornati
          const uid = this.tenant.userId();
          this.cv.get$(uid ?? undefined).subscribe({
            next: data => {
              this.education.set(data.education);
              this.experience.set(data.experience);
            }
          });
        },
        error: (err) => {
          // ⚠️ ROLLBACK: Ripristina l'elemento originale
          if (removedItem) {
            if (item.type === 'education') {
              this.education.update(items => {
                const newItems = [...items];
                newItems[position] = removedItem!;
                return newItems;
              });
            } else {
              this.experience.update(items => {
                const newItems = [...items];
                newItems[position] = removedItem!;
                return newItems;
              });
            }
          }
          
          const message = err?.error?.message || 'Errore durante la modifica';
          this.notificationService.add('error', message, 'cv-edit');
        }
      });
    } else {
      // NUOVO: Aggiungi nuovo record
      const payload = {
        type: item.type,
        title: item.title,
        time_start: item.startDate,
        time_end: item.endDate,
        description: item.description,
        order: item.insertPosition
      };
      
      this.http.post(apiUrl('cv'), payload).subscribe({
        next: () => {
          this.notificationService.add('success', 'Elemento aggiunto con successo', 'cv-add');
          
          // Ricarica dal backend per avere i dati corretti (con ID, ecc.)
          const uid = this.tenant.userId();
          this.cv.get$(uid ?? undefined).subscribe({
            next: data => {
              this.education.set(data.education);
              this.experience.set(data.experience);
            }
          });
        },
        error: (err) => {
          // ⚠️ ROLLBACK: Rimuovi l'elemento ottimistico
          if (item.type === 'education') {
            this.education.update(items => items.filter(i => i !== optimisticItem));
          } else {
            this.experience.update(items => items.filter(i => i !== optimisticItem));
          }
          
          const message = err?.error?.message || 'Errore durante l\'aggiunta';
          this.notificationService.add('error', message, 'cv-add');
        }
      });
    }
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
