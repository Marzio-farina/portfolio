import { Component, computed, inject, signal, effect, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { ProgettiCard, Progetto } from '../../components/progetti-card/progetti-card';
import { Filter } from '../../components/filter/filter';
import { ProjectService } from '../../services/project.service';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { TenantRouterService } from '../../services/tenant-router.service';
import { Notification, NotificationType } from '../../components/notification/notification';
import { ProjectDetailModalService } from '../../services/project-detail-modal.service';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  fieldId: string;
}

@Component({
  selector: 'app-progetti',
  imports: [
    ProgettiCard,
    Filter,
    Notification
  ],
  templateUrl: './progetti.html',
  styleUrl: './progetti.css'
})
export class Progetti implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api   = inject(ProjectService);
  private tenant = inject(TenantService);
  private auth = inject(AuthService);
  private edit = inject(EditModeService);
  private tenantRouter = inject(TenantRouterService);
  private projectDetailModal = inject(ProjectDetailModalService);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  projects = signal<Progetto[]>([]);
  // categoria selezionata
  selectedCategory = signal<string>('Tutti');

  // stati UI
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  // Gestione notifiche
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = false;
  
  // categorie uniche calcolate dai progetti
  categories = computed<string[]>(() => {
    const set = new Set(this.projects().map(p => p.category).filter(Boolean));
    return ['Tutti', ...Array.from(set).sort()];
  });

  // lista filtrata in base alla categoria scelta
  filtered = computed<Progetto[]>(() => {
    const cat = this.selectedCategory();
    const all = this.projects();
    return (cat === 'Tutti') ? all : all.filter(p => p.category === cat);
  });

  // Stato autenticazione - mostra la card aggiungi solo se loggato e in edit mode
  isAuthenticated = computed(() => this.auth.isAuthenticated());
  showEmptyAddCard = computed(() => this.isAuthenticated() && this.edit.isEditing());

  // Flag per prevenire re-entry nell'effect di aggiornamento
  private isUpdatingProject = false;

  constructor() {
    // Resetta l'invalidazione cache solo se non c'è stato un refresh della pagina dopo una modifica
    // Se siamo arrivati qui dopo una navigazione normale, mantieni il flag se era già impostato
    // (viene controllato automaticamente in loadProjects)
    
    // Verifica se siamo arrivati da add-project con successo
    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['created'] === 'true') {
      // Mostra notifica di successo
      const successNotification: NotificationItem = {
        id: `success-${Date.now()}`,
        message: 'Progetto creato con successo!',
        type: 'success',
        timestamp: Date.now(),
        fieldId: 'success'
      };
      this.notifications.set([successNotification]);
      this.showMultipleNotifications = true;
      
      // Rimuovi il parametro dalla URL dopo averlo letto
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ...queryParams, created: null },
        queryParamsHandling: 'merge'
      });
      
      // Ricarica i progetti bypassando la cache
      this.loadProjects(true);
    } else {
      this.loadProjects();
    }

    // Effect per aggiornare immediatamente la lista quando un progetto viene modificato
    effect(() => {
      const updatedProject = this.projectDetailModal.updatedProject();
      
      if (updatedProject && !this.isUpdatingProject) {
        this.isUpdatingProject = true;
        
        // Trova il progetto nella lista e aggiornalo con una nuova referenza
        const currentProjects = this.projects();
        const index = currentProjects.findIndex(p => p.id === updatedProject.id);
        
        if (index !== -1) {
          // Crea una nuova referenza per triggerare il change detection
          const updatedList = [...currentProjects];
          updatedList[index] = { ...updatedProject };
          this.projects.set(updatedList);
        }
        
        // Reset dopo un breve delay per evitare re-trigger
        setTimeout(() => {
          this.isUpdatingProject = false;
          // Reset del signal dopo aver processato l'aggiornamento
          setTimeout(() => {
            if (this.projectDetailModal.updatedProject()?.id === updatedProject.id) {
              this.projectDetailModal.updatedProject.set(null);
            }
          }, 0);
        }, 0);
      }
    });
  }

  ngOnDestroy(): void {
    // Il flag invalidateCacheOnNextLoad nel ProjectDetailModalService
    // verrà controllato automaticamente alla prossima chiamata di loadProjects()
    // quando il componente viene ricreato, quindi non serve fare nulla qui
  }

  private loadProjects(forceRefresh = false): void {
    this.loading.set(true);
    const uid = this.tenant.userId();
    
    // Se il servizio indica di invalidare la cache, forza il refresh
    const shouldInvalidateCache = this.projectDetailModal.invalidateCacheOnNextLoad();
    const finalForceRefresh = forceRefresh || shouldInvalidateCache;
    
    // Se abbiamo usato l'invalidazione, resetta il flag DOPO la chiamata
    // ma NON resettare invalidateCacheOnNextLoad, perché vogliamo che tutte le chiamate successive
    // in questa sessione usino dati freschi (il timestamp di sessione è già stato invalidato in markAsModified)
    if (shouldInvalidateCache) {
      // Il flag viene mantenuto true per assicurare che tutte le chiamate successive usino forceRefresh
      // fino a quando non si ricarica la pagina o si naviga via
    }
    
    this.api.listAll$(1000, uid ?? undefined, finalForceRefresh).subscribe({
      next: data => { 
        if (!data || data.length === 0) {
          // Seed demo: 6 card stile YouTube con poster random
          const seeds = Array.from({ length: 6 }).map((_, i) => {
            const seed = Math.random().toString(36).slice(2, 8);
            return {
              id: 10000 + i,
              title: `Project Seed ${seed.toUpperCase()} — Demo Layout`,
              category: ['Web', 'Mobile', 'Design'][i % 3],
              description: 'Demo project to showcase card UI',
              poster: `https://picsum.photos/seed/${seed}/800/450`,
              video: '',
              technologies: [
                { id: 1, title: 'Angular' },
                { id: 2, title: 'TypeScript' }
              ]
            } as Progetto;
          });
          this.projects.set(seeds);
        } else {
          this.projects.set(data);
        }
        this.loading.set(false); 
      },
      error: err => { this.errorMsg.set('Impossibile caricare i progetti.'); this.loading.set(false); }
    });
  }

  onProjectDeleted(id: number): void {
    // Rimuovi immediatamente la card dalla vista
    this.projects.set(this.projects().filter(p => p.id !== id));
    
    // Aggiungi notifica di successo
    this.addNotification('success', 'Progetto rimosso con successo.', `progetto-deleted-${id}`);
    
    // Ricarica i progetti bypassando la cache
    this.loadProjects(true);
  }

  onProjectDeleteError(event: { id: number; error: any }): void {
    // Estrai il messaggio di errore dall'errore HTTP
    // L'interceptor formatta gli errori in modo specifico
    let errorMessage = 'Errore durante l\'eliminazione del progetto.';
    
    if (event.error) {
      // Prova diversi percorsi per estrarre il messaggio
      if (typeof event.error === 'string') {
        errorMessage = event.error;
      } else if (event.error.message) {
        errorMessage = event.error.message;
      } else if (event.error.error?.message) {
        errorMessage = event.error.error.message;
      } else if (event.error.status === 404) {
        errorMessage = 'Progetto non trovato. Potrebbe essere già stato eliminato.';
      } else if (event.error.status === 403) {
        errorMessage = 'Non hai i permessi per eliminare questo progetto.';
      } else if (event.error.status) {
        errorMessage = `Errore ${event.error.status}: Impossibile eliminare il progetto.`;
      }
    }
    
    // Aggiungi notifica di errore
    this.addNotification('error', errorMessage, `progetto-delete-error-${event.id}`);
  }

  goToAddProgetto(): void {
    this.tenantRouter.navigate(['progetti', 'nuovo']);
  }

  onProjectClicked(project: Progetto): void {
    this.projectDetailModal.open(project);
  }
  
  onSelectCategory(c: string) {
    this.selectedCategory.set(c);
  }

  // Metodo per ottenere la notifica più grave per l'icona nell'angolo
  getMostSevereNotification(): NotificationItem | null {
    const currentNotifications = this.notifications();
    if (!currentNotifications.length) return null;
    const order: NotificationType[] = ['error', 'warning', 'info', 'success'];
    return [...currentNotifications].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
  }

  /**
   * Aggiunge una notifica alla lista
   */
  private addNotification(type: NotificationType, message: string, fieldId: string): void {
    const currentNotifications = this.notifications();
    
    // Controlla se esiste già una notifica con lo stesso messaggio e tipo (per evitare duplicati identici)
    const duplicate = currentNotifications.some(n => 
      n.message === message && 
      n.type === type && 
      // Per i fieldId con timestamp, confronta solo il prefisso
      (n.fieldId === fieldId || (fieldId.includes('-') && n.fieldId.startsWith(fieldId.split('-').slice(0, -1).join('-'))))
    );
    
    if (!duplicate) {
      const newNotification: NotificationItem = {
        id: `${fieldId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: message,
        type: type,
        timestamp: Date.now(),
        fieldId: fieldId
      };
      
      // Per fieldId fissi (come 'progetto-create'), rimuovi le notifiche precedenti con lo stesso fieldId
      // Per fieldId con timestamp, mantieni tutte le notifiche
      const hasTimestamp = /-\d+$/.test(fieldId);
      const filteredNotifications = hasTimestamp
        ? currentNotifications // Mantieni tutte le notifiche se il fieldId ha un timestamp
        : currentNotifications.filter(n => n.fieldId !== fieldId); // Rimuovi quelle con lo stesso fieldId se è fisso
      
      // Aggiungi la nuova notifica
      this.notifications.set([...filteredNotifications, newNotification]);
      this.showMultipleNotifications = true;
    }
  }
}
