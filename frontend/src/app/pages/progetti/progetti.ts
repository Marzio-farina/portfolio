import { Component, computed, inject, signal } from '@angular/core';
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
export class Progetti {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api   = inject(ProjectService);
  private tenant = inject(TenantService);
  private auth = inject(AuthService);
  private edit = inject(EditModeService);
  private tenantRouter = inject(TenantRouterService);

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

  constructor() {
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
  }

  private loadProjects(forceRefresh = false): void {
    this.loading.set(true);
    const uid = this.tenant.userId();
    this.api.listAll$(1000, uid ?? undefined, forceRefresh).subscribe({
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
              technologies: 'Angular, TypeScript'
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
    // Ricarica i progetti bypassando la cache
    this.loadProjects(true);
  }

  goToAddProgetto(): void {
    this.tenantRouter.navigate(['progetti', 'nuovo']);
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
}
