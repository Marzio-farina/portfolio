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
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-progetti',
  imports: [
    ProgettiCard,
    Filter,
    Notification
  ],
  providers: [NotificationService],
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
  protected notificationService = inject(NotificationService);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  projects = signal<Progetto[]>([]);
  // categoria selezionata
  selectedCategory = signal<string>('Tutti');
  
  // categorie caricate dal backend (tutte le categorie dell'utente)
  allCategories = signal<string[]>(['Tutti']);
  
  // categorie complete con ID per le card (passate da parent a child)
  categoriesWithId = signal<Array<{ id: number; title: string }>>([]);
  
  // categorie in stato pending (in creazione o eliminazione)
  pendingCategories = signal<Set<string>>(new Set());
  
  // categorie visibili filtrate in base alla modalità edit
  categories = computed<string[]>(() => {
    const all = this.allCategories();
    const projects = this.projects();
    const isEdit = this.edit.isEditing();
    
    // In edit mode, mostra tutte le categorie
    if (isEdit) {
      return all;
    }
    
    // In view mode, mostra solo le categorie che hanno progetti
    const categoriesWithProjects = new Set(projects.map(p => p.category).filter(Boolean));
    return all.filter(cat => cat === 'Tutti' || categoriesWithProjects.has(cat));
  });

  // stati UI
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  // lista filtrata in base alla categoria scelta
  filtered = computed<Progetto[]>(() => {
    const cat = this.selectedCategory();
    const all = this.projects();
    return (cat === 'Tutti') ? all : all.filter(p => p.category === cat);
  });

  // Stato autenticazione - mostra la card aggiungi solo se loggato e in edit mode
  isAuthenticated = computed(() => this.auth.isAuthenticated());
  showEmptyAddCard = computed(() => this.isAuthenticated() && this.edit.isEditing());
  
  // Permette l'eliminazione categorie solo se loggato e in edit mode
  canDeleteCategories = computed(() => this.isAuthenticated() && this.edit.isEditing());

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
      this.notificationService.addSuccess('Progetto creato con successo!');
      
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
    
    // Carica le categorie dal backend
    this.loadCategories();

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

  /**
   * Ordina le categorie: "Tutti" sempre per primo, poi alfabetico
   */
  private sortCategories(categories: string[]): string[] {
    return [...categories].sort((a, b) => {
      if (a === 'Tutti') return -1;
      if (b === 'Tutti') return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Carica le categorie dal backend
   */
  private loadCategories(): void {
    const uid = this.tenant.userId();
    
    this.api.getCategories$(uid ?? undefined).subscribe({
      next: (categories) => {
        // Estrai i titoli e aggiungi "Tutti", poi ordina in modo consistente
        const titles = ['Tutti', ...categories.map(c => c.title)];
        const sortedTitles = this.sortCategories(titles);
        this.allCategories.set(sortedTitles);
        
        // Salva anche le categorie complete per passarle alle card
        this.categoriesWithId.set(categories.map(c => ({ id: c.id, title: c.title })));
      },
      error: (err) => {
        console.error('Errore caricamento categorie:', err);
        // Mantieni almeno "Tutti" in caso di errore
        this.allCategories.set(['Tutti']);
        this.categoriesWithId.set([]);
      }
    });
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
    this.notificationService.add('success', 'Progetto rimosso con successo.', `progetto-deleted-${id}`);
    
    // NON ricaricare i progetti per permettere eliminazioni multiple
    // Il ricaricamento avverrà automaticamente quando l'utente ricarica la pagina
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
    this.notificationService.add('error', errorMessage, `progetto-delete-error-${event.id}`);
  }

  goToAddProgetto(): void {
    const selectedCat = this.selectedCategory();
    // Passa la categoria selezionata solo se non è "Tutti"
    if (selectedCat !== 'Tutti') {
      this.tenantRouter.navigate(['progetti', 'nuovo'], { 
        state: { preselectedCategory: selectedCat } 
      });
    } else {
      this.tenantRouter.navigate(['progetti', 'nuovo']);
    }
  }

  onProjectClicked(project: Progetto): void {
    this.projectDetailModal.open(project);
  }
  
  onProjectCategoryChanged(updatedProject: Progetto): void {
    // Aggiorna il progetto nella lista locale
    const currentProjects = this.projects();
    const index = currentProjects.findIndex(p => p.id === updatedProject.id);
    
    if (index !== -1) {
      // Progetto trovato, aggiornalo
      const updatedList = [...currentProjects];
      updatedList[index] = { ...updatedProject };
      this.projects.set(updatedList);
      
      // Mostra notifica di successo per cambio categoria
      this.notificationService.add('success', `Progetto spostato in categoria "${updatedProject.category}".`, `project-category-changed-${Date.now()}`);
      
      // Ricarica le categorie per aggiornare la lista dei filtri
      this.loadCategories();
    } else {
      // Progetto non trovato (probabilmente ripristinato dopo eliminazione)
      // Aggiungilo all'inizio della lista
      const updatedList = [updatedProject, ...currentProjects];
      this.projects.set(updatedList);
      
      // Mostra notifica di ripristino
      this.notificationService.add('success', 'Progetto ripristinato con successo.', `project-restored-${Date.now()}`);
    }
    
    // Se il filtro corrente non è "Tutti" e non è la nuova categoria,
    // switcha automaticamente a "Tutti" per mostrare il progetto
    const currentFilter = this.selectedCategory();
    if (currentFilter !== 'Tutti' && currentFilter !== updatedProject.category) {
      this.selectedCategory.set('Tutti');
    }
  }
  
  onSelectCategory(c: string) {
    this.selectedCategory.set(c);
  }

  /**
   * Aggiunge una nuova categoria (optimistic update)
   */
  onAddCategory(categoryTitle: string): void {
    const trimmedTitle = categoryTitle.trim();
    
    if (!trimmedTitle) {
      return;
    }
    
    // Verifica se la categoria esiste già (controlla in tutte le categorie)
    if (this.allCategories().includes(trimmedTitle)) {
      this.notificationService.add('warning', `La categoria "${trimmedTitle}" esiste già.`, `category-exists-${Date.now()}`);
      return;
    }
    
    // OPTIMISTIC UPDATE: aggiungi subito la categoria all'UI
    const currentCategories = this.allCategories();
    const newCategories = this.sortCategories([...currentCategories, trimmedTitle]);
    this.allCategories.set(newCategories);
    
    // Aggiungi a pendingCategories per mostrarla disabilitata
    const currentPending = this.pendingCategories();
    const newPending = new Set(currentPending);
    newPending.add(trimmedTitle);
    this.pendingCategories.set(newPending);
    
    // Chiama l'API per creare la categoria
    this.api.createCategory(trimmedTitle).subscribe({
      next: (response) => {
        // Rimuovi da pendingCategories (ora è attiva)
        const updatedPending = this.pendingCategories();
        const finalPending = new Set(updatedPending);
        finalPending.delete(trimmedTitle);
        this.pendingCategories.set(finalPending);
        
        // Mostra notifica di successo
        this.notificationService.add('success', `Categoria "${trimmedTitle}" creata con successo.`, `category-created-${Date.now()}`);
        
        // Ricarica le categorie dal backend per sincronizzare
        this.loadCategories();
      },
      error: (err) => {
        console.error('Errore creazione categoria:', err);
        const errorMessage = err.error?.message || err.message || 'Errore sconosciuto';
        
        // ROLLBACK: rimuovi la categoria da allCategories e pendingCategories
        const rollbackCategories = this.allCategories().filter(c => c !== trimmedTitle);
        this.allCategories.set(rollbackCategories);
        
        const rollbackPending = this.pendingCategories();
        const finalPending = new Set(rollbackPending);
        finalPending.delete(trimmedTitle);
        this.pendingCategories.set(finalPending);
        
        this.notificationService.add('error', `Errore nella creazione della categoria: ${errorMessage}`, `category-create-error-${Date.now()}`);
      }
    });
  }

  /**
   * Elimina una categoria (optimistic update)
   */
  onDeleteCategory(categoryTitle: string): void {
    // Verifica quanti progetti hanno questa categoria
    const projectsWithCategory = this.projects().filter(p => p.category === categoryTitle).length;
    
    if (projectsWithCategory > 0) {
      this.notificationService.add(
        'warning', 
        `Impossibile eliminare la categoria "${categoryTitle}". Ci sono ${projectsWithCategory} progetti associati. Riassegna prima i progetti ad un'altra categoria.`, 
        `category-has-projects-${Date.now()}`
      );
      return;
    }

    // OPTIMISTIC UPDATE: aggiungi la categoria a pendingCategories per mostrarla disabilitata
    // (non la rimuoviamo ancora da allCategories per evitare un "flash")
    const currentPending = this.pendingCategories();
    const newPending = new Set(currentPending);
    newPending.add(categoryTitle);
    this.pendingCategories.set(newPending);

    this.api.deleteCategory(categoryTitle).subscribe({
      next: () => {
        // Rimuovi la categoria da allCategories
        const updatedCategories = this.allCategories().filter(c => c !== categoryTitle);
        this.allCategories.set(updatedCategories);
        
        // Rimuovi da pendingCategories
        const updatedPending = this.pendingCategories();
        const finalPending = new Set(updatedPending);
        finalPending.delete(categoryTitle);
        this.pendingCategories.set(finalPending);
        
        // Se la categoria eliminata era selezionata, torna a "Tutti"
        if (this.selectedCategory() === categoryTitle) {
          this.selectedCategory.set('Tutti');
        }
        
        this.notificationService.add('success', `Categoria "${categoryTitle}" eliminata con successo.`, `category-deleted-${Date.now()}`);
        
        // Ricarica le categorie dal backend per sincronizzare
        this.loadCategories();
      },
      error: (err) => {
        console.error('Errore eliminazione categoria:', err);
        const errorMessage = err.error?.message || err.message || 'Errore sconosciuto';
        
        // ROLLBACK: rimuovi da pendingCategories (ripristina stato normale)
        const rollbackPending = this.pendingCategories();
        const finalPending = new Set(rollbackPending);
        finalPending.delete(categoryTitle);
        this.pendingCategories.set(finalPending);
        
        this.notificationService.add('error', errorMessage, `category-delete-error-${Date.now()}`);
      }
    });
  }

  // Metodo per ottenere la notifica più grave per l'icona nell'angolo
  getMostSevereNotification() {
    return this.notificationService.getMostSevere();
  }
}
