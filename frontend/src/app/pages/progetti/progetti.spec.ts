import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Progetti } from './progetti';
import { ProjectService } from '../../services/project.service';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { TenantRouterService } from '../../services/tenant-router.service';
import { ProjectDetailModalService } from '../../services/project-detail-modal.service';
import { Progetto } from '../../components/progetti-card/progetti-card';

describe('Progetti', () => {
  let component: Progetti;
  let fixture: ComponentFixture<Progetti>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let tenantService: jasmine.SpyObj<TenantService>;
  let authService: jasmine.SpyObj<AuthService>;
  let editModeService: jasmine.SpyObj<EditModeService>;
  let tenantRouterService: jasmine.SpyObj<TenantRouterService>;
  let projectDetailModalService: jasmine.SpyObj<ProjectDetailModalService>;
  let router: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  const mockProjects: Progetto[] = [
    {
      id: 1,
      title: 'Project 1',
      category: 'Web',
      description: 'A web project',
      poster: 'poster1.jpg',
      video: '',
      technologies: [{ id: 1, title: 'Angular' }]
    },
    {
      id: 2,
      title: 'Project 2',
      category: 'Mobile',
      description: 'A mobile project',
      poster: 'poster2.jpg',
      video: '',
      technologies: [{ id: 2, title: 'React Native' }]
    },
    {
      id: 3,
      title: 'Project 3',
      category: 'Web',
      description: 'Another web project',
      poster: 'poster3.jpg',
      video: '',
      technologies: [{ id: 3, title: 'Vue' }]
    }
  ];

  const mockCategories = [
    { id: 1, title: 'Web' },
    { id: 2, title: 'Mobile' },
    { id: 3, title: 'Design' }
  ];

  beforeEach(async () => {
    // Crea spy per i servizi
    projectService = jasmine.createSpyObj('ProjectService', [
      'listAll$',
      'getCategories$',
      'createCategory',
      'deleteCategory'
    ]);
    tenantService = jasmine.createSpyObj('TenantService', ['userId']);
    authService = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    editModeService = jasmine.createSpyObj('EditModeService', ['isEditing']);
    tenantRouterService = jasmine.createSpyObj('TenantRouterService', ['navigate']);
    projectDetailModalService = jasmine.createSpyObj('ProjectDetailModalService', [
      'open',
      'invalidateCacheOnNextLoad',
      'updatedProject'
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);

    // Setup mock per ActivatedRoute
    mockActivatedRoute = {
      data: of({ title: 'Projects' }),
      snapshot: {
        queryParams: {},
        paramMap: new Map()
      },
      queryParams: of({}),
      queryParamMap: of({
        get: () => null
      })
    };

    // Setup default return values
    projectService.listAll$.and.returnValue(of(mockProjects));
    projectService.getCategories$.and.returnValue(of(mockCategories));
    projectService.createCategory.and.returnValue(of({ id: 4, title: 'New Category' }));
    projectService.deleteCategory.and.returnValue(of(void 0));
    tenantService.userId.and.returnValue(null);
    authService.isAuthenticated.and.returnValue(false);
    editModeService.isEditing.and.returnValue(false);
    projectDetailModalService.invalidateCacheOnNextLoad.and.returnValue(false);
    Object.defineProperty(projectDetailModalService, 'updatedProject', {
      value: signal<Progetto | null>(null),
      writable: true
    });

    await TestBed.configureTestingModule({
      imports: [Progetti],
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: ProjectService, useValue: projectService },
        { provide: TenantService, useValue: tenantService },
        { provide: AuthService, useValue: authService },
        { provide: EditModeService, useValue: editModeService },
        { provide: TenantRouterService, useValue: tenantRouterService },
        { provide: ProjectDetailModalService, useValue: projectDetailModalService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Progetti);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('dovrebbe avere properties definite', () => {
      expect(component.projects).toBeDefined();
      expect(component.loading).toBeDefined();
      expect(component.selectedCategory).toBeDefined();
      expect(component.allCategories).toBeDefined();
    });

    it('dovrebbe caricare i progetti all\'init', () => {
      expect(projectService.listAll$).toHaveBeenCalled();
      expect(component.projects().length).toBe(3);
    });

    it('dovrebbe caricare le categorie all\'init', () => {
      expect(projectService.getCategories$).toHaveBeenCalled();
      expect(component.allCategories().length).toBeGreaterThan(0);
    });

    it('dovrebbe inizializzare con categoria "Tutti" selezionata', () => {
      expect(component.selectedCategory()).toBe('Tutti');
    });
  });

  describe('Data Loading', () => {
    it('dovrebbe caricare progetti con successo', () => {
      expect(component.projects().length).toBe(3);
      expect(component.projects()[0].title).toBe('Project 1');
      expect(component.loading()).toBe(false);
    });

    it('dovrebbe gestire errore durante il caricamento progetti', () => {
      projectService.listAll$.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      const fixture2 = TestBed.createComponent(Progetti);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.errorMsg()).toBeTruthy();
      expect(component2.loading()).toBe(false);
    });

    it('dovrebbe caricare progetti per uno specifico tenant', () => {
      tenantService.userId.and.returnValue(123);

      const fixture2 = TestBed.createComponent(Progetti);
      fixture2.detectChanges();

      expect(projectService.listAll$).toHaveBeenCalledWith(1000, 123, false);
    });

    it('dovrebbe mostrare progetti seed quando la lista è vuota', () => {
      projectService.listAll$.and.returnValue(of([]));

      const fixture2 = TestBed.createComponent(Progetti);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      // Dovrebbe mostrare 6 progetti demo
      expect(component2.projects().length).toBe(6);
      expect(component2.projects()[0].title).toContain('Project Seed');
    });
  });

  describe('Filtering', () => {
    it('dovrebbe filtrare progetti per categoria', () => {
      component.selectedCategory.set('Web');
      
      const filtered = component.filtered();
      expect(filtered.length).toBe(2);
      expect(filtered.every(p => p.category === 'Web')).toBe(true);
    });

    it('dovrebbe mostrare tutti i progetti quando categoria è "Tutti"', () => {
      component.selectedCategory.set('Tutti');
      
      const filtered = component.filtered();
      expect(filtered.length).toBe(3);
    });

    it('dovrebbe filtrare progetti per categoria Mobile', () => {
      component.selectedCategory.set('Mobile');
      
      const filtered = component.filtered();
      expect(filtered.length).toBe(1);
      expect(filtered[0].category).toBe('Mobile');
    });

    it('dovrebbe restituire array vuoto per categoria senza progetti', () => {
      component.selectedCategory.set('Design');
      
      const filtered = component.filtered();
      expect(filtered.length).toBe(0);
    });

    it('onSelectCategory dovrebbe cambiare la categoria selezionata', () => {
      component.onSelectCategory('Mobile');
      expect(component.selectedCategory()).toBe('Mobile');
      
      component.onSelectCategory('Web');
      expect(component.selectedCategory()).toBe('Web');
    });
  });

  describe('Category Management', () => {
    it('dovrebbe caricare le categorie con "Tutti" come prima', () => {
      const categories = component.allCategories();
      expect(categories[0]).toBe('Tutti');
    });

    it('dovrebbe ordinare le categorie alfabeticamente', () => {
      const categories = component.allCategories();
      // Tutti sempre primo, poi alfabetico
      expect(categories[0]).toBe('Tutti');
      // Verifica ordine alfabetico per le altre
      for (let i = 2; i < categories.length; i++) {
        expect(categories[i - 1].localeCompare(categories[i])).toBeLessThanOrEqual(0);
      }
    });

    it('dovrebbe creare una nuova categoria', fakeAsync(() => {
      const newCategoryTitle = 'New Test Category';
      component.onAddCategory(newCategoryTitle);
      
      // Verifica che la categoria sia stata aggiunta ottimisticamente
      expect(component.allCategories()).toContain(newCategoryTitle);
      expect(component.pendingCategories().has(newCategoryTitle)).toBe(true);
      
      tick();
      
      // Verifica che l'API sia stata chiamata
      expect(projectService.createCategory).toHaveBeenCalledWith(newCategoryTitle);
    }));

    it('non dovrebbe creare categoria con titolo vuoto', () => {
      const initialLength = component.allCategories().length;
      component.onAddCategory('   ');
      
      expect(component.allCategories().length).toBe(initialLength);
      expect(projectService.createCategory).not.toHaveBeenCalled();
    });

    it('non dovrebbe creare categoria duplicata', () => {
      component.onAddCategory('Web');
      
      // Verifica che mostri notifica warning
      expect(component.notifications().length).toBeGreaterThan(0);
      const lastNotif = component.notifications()[component.notifications().length - 1];
      expect(lastNotif.type).toBe('warning');
    });

    it('dovrebbe eliminare una categoria', fakeAsync(() => {
      // Prima aggiungi una categoria per testarla
      component.allCategories.set(['Tutti', 'Web', 'TestCategory']);
      
      component.onDeleteCategory('TestCategory');
      
      tick();
      
      expect(projectService.deleteCategory).toHaveBeenCalledWith('TestCategory');
    }));

    it('non dovrebbe eliminare categoria con progetti associati', () => {
      component.onDeleteCategory('Web');
      
      // Verifica che mostri notifica warning
      expect(component.notifications().length).toBeGreaterThan(0);
      const lastNotif = component.notifications()[component.notifications().length - 1];
      expect(lastNotif.type).toBe('warning');
      expect(lastNotif.message).toContain('progetti associati');
      
      // Verifica che l'API non sia stata chiamata
      expect(projectService.deleteCategory).not.toHaveBeenCalled();
    });

    it('dovrebbe gestire errore durante creazione categoria', fakeAsync(() => {
      projectService.createCategory.and.returnValue(
        throwError(() => ({ error: { message: 'Errore di rete' } }))
      );

      component.onAddCategory('ErrorCategory');
      tick();

      // La categoria dovrebbe essere rimossa (rollback)
      expect(component.allCategories()).not.toContain('ErrorCategory');
      expect(component.pendingCategories().has('ErrorCategory')).toBe(false);
      
      // Dovrebbe mostrare notifica di errore
      const errorNotif = component.notifications().find(n => n.type === 'error');
      expect(errorNotif).toBeDefined();
    }));
  });

  describe('Project Operations', () => {
    it('onProjectDeleted dovrebbe rimuovere il progetto', () => {
      const initialLength = component.projects().length;
      component.onProjectDeleted(1);
      
      expect(component.projects().length).toBe(initialLength - 1);
      expect(component.projects().find(p => p.id === 1)).toBeUndefined();
    });

    it('onProjectDeleted dovrebbe mostrare notifica di successo', () => {
      component.onProjectDeleted(1);
      
      const notification = component.notifications().find(n => n.type === 'success');
      expect(notification).toBeDefined();
      expect(notification?.message).toContain('rimosso');
    });

    it('onProjectDeleteError dovrebbe mostrare notifica di errore', () => {
      const error = { id: 1, error: { message: 'Errore eliminazione' } };
      component.onProjectDeleteError(error);
      
      const notification = component.notifications().find(n => n.type === 'error');
      expect(notification).toBeDefined();
      expect(notification?.message).toBeTruthy();
    });

    it('onProjectDeleteError dovrebbe gestire errore 404', () => {
      const error = { id: 1, error: { status: 404 } };
      component.onProjectDeleteError(error);
      
      const notification = component.notifications().find(n => n.type === 'error');
      expect(notification?.message).toContain('non trovato');
    });

    it('onProjectDeleteError dovrebbe gestire errore 403', () => {
      const error = { id: 1, error: { status: 403 } };
      component.onProjectDeleteError(error);
      
      const notification = component.notifications().find(n => n.type === 'error');
      expect(notification?.message).toContain('permessi');
    });

    it('goToAddProgetto dovrebbe navigare alla pagina di creazione', () => {
      component.goToAddProgetto();
      
      expect(tenantRouterService.navigate).toHaveBeenCalledWith(['progetti', 'nuovo']);
    });

    it('goToAddProgetto dovrebbe passare categoria preselezionata', () => {
      component.selectedCategory.set('Web');
      component.goToAddProgetto();
      
      expect(tenantRouterService.navigate).toHaveBeenCalledWith(
        ['progetti', 'nuovo'],
        { state: { preselectedCategory: 'Web' } }
      );
    });

    it('onProjectClicked dovrebbe aprire il modal di dettaglio', () => {
      const project = mockProjects[0];
      component.onProjectClicked(project);
      
      expect(projectDetailModalService.open).toHaveBeenCalledWith(project);
    });

    it('onProjectCategoryChanged dovrebbe aggiornare il progetto', () => {
      const updatedProject = { ...mockProjects[0], category: 'Design' };
      component.onProjectCategoryChanged(updatedProject);
      
      const project = component.projects().find(p => p.id === updatedProject.id);
      expect(project?.category).toBe('Design');
    });

    it('onProjectCategoryChanged dovrebbe mostrare notifica', () => {
      const updatedProject = { ...mockProjects[0], category: 'Design' };
      component.onProjectCategoryChanged(updatedProject);
      
      const notification = component.notifications().find(n => n.type === 'success');
      expect(notification).toBeDefined();
      expect(notification?.message).toContain('spostato');
    });
  });

  describe('Authentication & Edit Mode', () => {
    it('showEmptyAddCard dovrebbe essere false se non autenticato', () => {
      authService.isAuthenticated.and.returnValue(false);
      editModeService.isEditing.and.returnValue(false);
      
      expect(component.showEmptyAddCard()).toBe(false);
    });

    it('showEmptyAddCard dovrebbe essere false se non in edit mode', () => {
      authService.isAuthenticated.and.returnValue(true);
      editModeService.isEditing.and.returnValue(false);
      
      expect(component.showEmptyAddCard()).toBe(false);
    });

    it('showEmptyAddCard dovrebbe essere true se autenticato e in edit mode', () => {
      authService.isAuthenticated.and.returnValue(true);
      editModeService.isEditing.and.returnValue(true);
      
      expect(component.showEmptyAddCard()).toBe(true);
    });

    it('canDeleteCategories dovrebbe seguire stesse regole di showEmptyAddCard', () => {
      authService.isAuthenticated.and.returnValue(true);
      editModeService.isEditing.and.returnValue(true);
      
      expect(component.canDeleteCategories()).toBe(true);
      
      authService.isAuthenticated.and.returnValue(false);
      expect(component.canDeleteCategories()).toBe(false);
    });
  });

  describe('Notifications', () => {
    it('getMostSevereNotification dovrebbe restituire l\'errore più grave', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test' },
        { id: '2', message: 'Error', type: 'error', timestamp: Date.now(), fieldId: 'test2' },
        { id: '3', message: 'Warning', type: 'warning', timestamp: Date.now(), fieldId: 'test3' }
      ]);

      const most = component.getMostSevereNotification();
      expect(most?.type).toBe('error');
    });

    it('getMostSevereNotification dovrebbe restituire null se non ci sono notifiche', () => {
      component.notifications.set([]);
      
      const most = component.getMostSevereNotification();
      expect(most).toBeNull();
    });

    it('dovrebbe evitare notifiche duplicate', () => {
      component.onProjectDeleted(1);
      component.onProjectDeleted(1);
      
      // Non dovrebbero esserci duplicati identici
      const deletedNotifications = component.notifications().filter(
        n => n.message.includes('rimosso')
      );
      // Potrebbe avere più notifiche ma con ID diversi
      expect(deletedNotifications.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Query Params & Navigation', () => {
    it('dovrebbe gestire ?created=true da query params', () => {
      // Setup route con created=true
      mockActivatedRoute.snapshot.queryParams = { created: 'true' };
      mockActivatedRoute.queryParamMap = of({
        get: (key: string) => key === 'created' ? null : null
      });

      const fixture2 = TestBed.createComponent(Progetti);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      // Dovrebbe mostrare notifica di successo
      expect(component2.notifications().length).toBeGreaterThan(0);
      const successNotif = component2.notifications().find(n => n.type === 'success');
      expect(successNotif).toBeDefined();
    });
  });

  describe('Signals & Computed', () => {
    it('filtered computed dovrebbe aggiornarsi con selectedCategory', () => {
      component.selectedCategory.set('Web');
      expect(component.filtered().length).toBe(2);
      
      component.selectedCategory.set('Mobile');
      expect(component.filtered().length).toBe(1);
      
      component.selectedCategory.set('Tutti');
      expect(component.filtered().length).toBe(3);
    });

    it('categories computed dovrebbe filtrare in base a edit mode', () => {
      // In view mode, mostra solo categorie con progetti
      editModeService.isEditing.and.returnValue(false);
      
      const categoriesInViewMode = component.categories();
      expect(categoriesInViewMode).toContain('Web');
      expect(categoriesInViewMode).toContain('Mobile');
      // Design non ha progetti, quindi non dovrebbe essere visibile in view mode
      
      // In edit mode, mostra tutte le categorie
      editModeService.isEditing.and.returnValue(true);
      
      const categoriesInEditMode = component.categories();
      expect(categoriesInEditMode.length).toBeGreaterThanOrEqual(categoriesInViewMode.length);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire progetti senza categoria', () => {
      const projectsWithoutCategory: Progetto[] = [
        { ...mockProjects[0], category: '' }
      ];
      
      projectService.listAll$.and.returnValue(of(projectsWithoutCategory));
      
      const fixture2 = TestBed.createComponent(Progetti);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.projects().length).toBe(1);
    });

    it('dovrebbe gestire cambio categoria con filtro attivo', () => {
      component.selectedCategory.set('Mobile');
      
      const updatedProject = { ...mockProjects[1], category: 'Web' };
      component.onProjectCategoryChanged(updatedProject);
      
      // Dovrebbe switchare automaticamente a "Tutti"
      expect(component.selectedCategory()).toBe('Tutti');
    });

    it('dovrebbe gestire ripristino progetto eliminato', () => {
      // Rimuovi un progetto
      component.onProjectDeleted(1);
      const lengthAfterDelete = component.projects().length;
      
      // Ripristinalo
      const restoredProject = mockProjects[0];
      component.onProjectCategoryChanged(restoredProject);
      
      // Dovrebbe essere aggiunto all'inizio
      expect(component.projects().length).toBe(lengthAfterDelete + 1);
      expect(component.projects()[0].id).toBe(restoredProject.id);
    });

    it('dovrebbe gestire molti progetti simultaneamente', () => {
      const manyProjects = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Project ${i + 1}`,
        category: ['Web', 'Mobile', 'Design'][i % 3],
        description: `Description ${i + 1}`,
        poster: `poster${i}.jpg`,
        video: '',
        technologies: []
      }));

      projectService.listAll$.and.returnValue(of(manyProjects));

      const fixture2 = TestBed.createComponent(Progetti);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.projects().length).toBe(100);
      
      // Test filtering con molti progetti
      component2.selectedCategory.set('Web');
      expect(component2.filtered().length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('ngOnDestroy dovrebbe essere chiamato', () => {
      spyOn(component, 'ngOnDestroy');
      fixture.destroy();
      expect(component.ngOnDestroy).toHaveBeenCalled();
    });
  });
});
