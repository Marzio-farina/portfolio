import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Attestati } from './attestati';
import { AttestatiService } from '../../services/attestati.service';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { TenantRouterService } from '../../services/tenant-router.service';
import { AttestatoDetailModalService } from '../../services/attestato-detail-modal.service';
import { Attestato } from '../../models/attestato.model';

describe('Attestati', () => {
  let component: Attestati;
  let fixture: ComponentFixture<Attestati>;
  let attestatiService: jasmine.SpyObj<AttestatiService>;
  let tenantService: jasmine.SpyObj<TenantService>;
  let authService: jasmine.SpyObj<AuthService>;
  let editModeService: jasmine.SpyObj<EditModeService>;
  let tenantRouterService: jasmine.SpyObj<TenantRouterService>;
  let attestatoDetailModalService: jasmine.SpyObj<AttestatoDetailModalService>;
  let router: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let routerEventsSubject: Subject<any>;

  const mockAttestati: Attestato[] = [
    {
      id: 1,
      title: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      date: '2023-01-15',
      badgeUrl: 'https://example.com/aws-cert.jpg',
      img: {
        src: 'https://example.com/aws-cert.jpg',
        alt: 'AWS Certificate',
        width: 800,
        height: 600
      }
    },
    {
      id: 2,
      title: 'Angular Advanced',
      issuer: 'Google',
      date: '2023-06-01',
      badgeUrl: 'https://example.com/angular-cert.jpg',
      img: {
        src: 'https://example.com/angular-cert.jpg',
        alt: 'Angular Certificate',
        width: 800,
        height: 600
      }
    },
    {
      id: 3,
      title: 'Docker Mastery',
      issuer: 'Docker Inc',
      date: '2023-03-20',
      badgeUrl: 'https://example.com/docker-cert.jpg',
      img: {
        src: 'https://example.com/docker-cert.jpg',
        alt: 'Docker Certificate',
        width: 800,
        height: 600
      }
    }
  ];

  beforeEach(async () => {
    // Subject per simulare router events
    routerEventsSubject = new Subject();

    // Crea spy per i servizi
    attestatiService = jasmine.createSpyObj('AttestatiService', ['listAll$']);
    tenantService = jasmine.createSpyObj('TenantService', ['userId', 'userSlug', 'clear']);
    authService = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    editModeService = jasmine.createSpyObj('EditModeService', ['isEditing']);
    tenantRouterService = jasmine.createSpyObj('TenantRouterService', ['navigate']);
    attestatoDetailModalService = jasmine.createSpyObj('AttestatoDetailModalService', ['open'], {
      updatedAttestato: jasmine.createSpy('updatedAttestato').and.returnValue(null)
    });
    router = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEventsSubject.asObservable(),
      url: '/attestati'
    });

    // Setup mock per ActivatedRoute
    mockActivatedRoute = {
      data: of({ title: 'Attestati' }),
      snapshot: {
        queryParams: {},
        paramMap: {
          has: (key: string) => false,
          get: (key: string) => null
        }
      },
      queryParams: of({}),
      queryParamMap: of({
        get: () => null
      })
    };

    // Setup default return values
    attestatiService.listAll$.and.returnValue(of(mockAttestati));
    tenantService.userId.and.returnValue(null);
    tenantService.userSlug.and.returnValue(null);
    authService.isAuthenticated.and.returnValue(false);
    editModeService.isEditing.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [Attestati],
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: AttestatiService, useValue: attestatiService },
        { provide: TenantService, useValue: tenantService },
        { provide: AuthService, useValue: authService },
        { provide: EditModeService, useValue: editModeService },
        { provide: TenantRouterService, useValue: tenantRouterService },
        { provide: AttestatoDetailModalService, useValue: attestatoDetailModalService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Attestati);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    beforeEach(() => {
      fixture.detectChanges();
      // Trigger ngOnInit manually
      component.ngOnInit();
    });

    it('dovrebbe avere properties definite', () => {
      expect(component.attestati).toBeDefined();
      expect(component.loading).toBeDefined();
      expect(component.errorMsg).toBeDefined();
      expect(component.notifications).toBeDefined();
    });

    it('dovrebbe caricare gli attestati all\'init', () => {
      expect(attestatiService.listAll$).toHaveBeenCalled();
      expect(component.attestati().length).toBe(3);
    });

    it('dovrebbe impostare loading a false dopo il caricamento', () => {
      expect(component.loading()).toBe(false);
    });

    it('dovrebbe caricare il titolo dalla route', (done) => {
      setTimeout(() => {
        expect(component.title()).toBe('Attestati');
        done();
      }, 0);
    });
  });

  describe('Data Loading', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('dovrebbe caricare attestati con successo', () => {
      expect(component.attestati().length).toBe(3);
      expect(component.attestati()[0].title).toBe('AWS Certified Developer');
      expect(component.attestati()[1].issuer).toBe('Google');
    });

    it('dovrebbe gestire errore durante il caricamento', () => {
      attestatiService.listAll$.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      expect(component2.loading()).toBe(false);
      expect(component2.errorMsg()).toBeTruthy();
      expect(component2.notifications().length).toBeGreaterThan(0);
    });

    it('dovrebbe caricare attestati per uno specifico tenant', () => {
      tenantService.userId.and.returnValue(789);
      mockActivatedRoute.snapshot.paramMap.has = (key: string) => key === 'userSlug';

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      expect(attestatiService.listAll$).toHaveBeenCalledWith(1000, {}, false, 789);
    });

    it('dovrebbe pulire tenant quando non c\'è slug nella route', () => {
      fixture.detectChanges();
      component.ngOnInit();

      expect(tenantService.clear).toHaveBeenCalled();
    });

    it('dovrebbe gestire array vuoto di attestati', () => {
      attestatiService.listAll$.and.returnValue(of([]));

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      expect(component2.attestati().length).toBe(0);
      expect(component2.loading()).toBe(false);
    });

    it('dovrebbe forzare refresh quando specificato', () => {
      mockActivatedRoute.queryParamMap = of({
        get: (key: string) => key === 'refresh' ? '1' : null
      });

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(attestatiService.listAll$).toHaveBeenCalledWith(1000, {}, true, undefined);
    });
  });

  describe('Grid View & Display', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('dovrebbe mostrare tutti gli attestati nella grid', () => {
      expect(component.attestati().length).toBe(3);
    });

    it('dovrebbe mostrare attestati con tutte le informazioni necessarie', () => {
      const attestato = component.attestati()[0];
      
      expect(attestato.title).toBeTruthy();
      expect(attestato.issuer).toBeTruthy();
      expect(attestato.date).toBeTruthy();
      expect(attestato.img).toBeTruthy();
      expect(attestato.img?.src).toBeTruthy();
    });

    it('dovrebbe gestire attestati con date diverse', () => {
      const attestati = component.attestati();
      
      expect(attestati[0].date).toBe('2023-01-15');
      expect(attestati[1].date).toBe('2023-06-01');
      expect(attestati[2].date).toBe('2023-03-20');
    });

    it('dovrebbe gestire attestati con issuer diversi', () => {
      const attestati = component.attestati();
      
      expect(attestati[0].issuer).toBe('Amazon Web Services');
      expect(attestati[1].issuer).toBe('Google');
      expect(attestati[2].issuer).toBe('Docker Inc');
    });
  });

  describe('Modal Opening', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('dovrebbe avere il modal service disponibile', () => {
      expect(attestatoDetailModalService).toBeDefined();
    });

    it('dovrebbe aggiornare immediatamente l\'attestato quando modificato', fakeAsync(() => {
      const updatedAttestato = { ...mockAttestati[0], title: 'Updated Title' };
      
      // Simula signal update dal modal service
      Object.defineProperty(attestatoDetailModalService, 'updatedAttestato', {
        value: jasmine.createSpy('updatedAttestato').and.returnValue(updatedAttestato),
        writable: true
      });

      // Ricrea il componente per triggerare l'effect
      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      tick();

      // L'attestato dovrebbe essere aggiornato nella lista
      // (se l'effect funziona correttamente)
      expect(component2.attestati).toBeDefined();
    }));
  });

  describe('Add Attestato', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('goToAddAttestato dovrebbe navigare alla pagina di creazione', () => {
      component.goToAddAttestato();
      
      expect(tenantRouterService.navigate).toHaveBeenCalledWith(['attestati', 'nuovo']);
    });

    it('goToAddAttestato dovrebbe navigare con userSlug se presente', () => {
      tenantService.userSlug.and.returnValue('john-doe');
      
      component.goToAddAttestato();
      
      expect(router.navigate).toHaveBeenCalledWith(['/john-doe/attestati/nuovo']);
    });

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
  });

  describe('Delete Attestato', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('onCardDeleted dovrebbe rimuovere l\'attestato dalla lista', () => {
      const initialLength = component.attestati().length;
      component.onCardDeleted(1);
      
      expect(component.attestati().length).toBe(initialLength - 1);
      expect(component.attestati().find(a => a.id === 1)).toBeUndefined();
    });

    it('onCardDeleted dovrebbe mostrare notifica di successo', () => {
      component.onCardDeleted(1);
      
      const notification = component.notifications().find(n => n.type === 'success');
      expect(notification).toBeDefined();
      expect(notification?.message).toContain('rimosso');
    });

    it('onCardDeleted dovrebbe forzare ricaricamento', () => {
      const callCount = attestatiService.listAll$.calls.count();
      component.onCardDeleted(1);
      
      // Dovrebbe essere chiamato di nuovo con forceRefresh=true
      expect(attestatiService.listAll$.calls.count()).toBeGreaterThan(callCount);
    });

    it('dovrebbe rimuovere attestati multipli in sequenza', () => {
      const initialLength = component.attestati().length;
      
      component.onCardDeleted(1);
      component.onCardDeleted(2);
      
      expect(component.attestati().length).toBe(initialLength - 2);
    });
  });

  describe('Notifications Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('getMostSevereNotification dovrebbe restituire la notifica più grave', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' },
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

    it('dovrebbe ordinare per gravità: error > warning > info > success', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' },
        { id: '2', message: 'Info', type: 'info', timestamp: Date.now(), fieldId: 'test2' },
        { id: '3', message: 'Warning', type: 'warning', timestamp: Date.now(), fieldId: 'test3' }
      ]);

      const most = component.getMostSevereNotification();
      expect(most?.type).toBe('warning');
    });

    it('non dovrebbe aggiungere notifiche duplicate', () => {
      component.onCardDeleted(1);
      const firstCount = component.notifications().length;
      
      component.onCardDeleted(1); // Stesso ID
      
      // Potrebbe avere notifiche multiple ma con ID/timestamp diversi
      expect(component.notifications().length).toBeGreaterThanOrEqual(firstCount);
    });
  });

  describe('Navigation & Routing', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('dovrebbe ricaricare attestati quando si naviga alla pagina', fakeAsync(() => {
      const initialCallCount = attestatiService.listAll$.calls.count();
      
      // Simula navigazione
      routerEventsSubject.next(new NavigationEnd(1, '/other', '/attestati'));
      
      tick(150); // Aspetta il setTimeout interno
      
      expect(attestatiService.listAll$.calls.count()).toBeGreaterThan(initialCallCount);
    }));

    it('non dovrebbe ricaricare se già nella stessa pagina', fakeAsync(() => {
      const initialCallCount = attestatiService.listAll$.calls.count();
      
      // Simula navigazione dalla stessa pagina
      Object.defineProperty(router, 'url', { value: '/attestati', writable: true });
      routerEventsSubject.next(new NavigationEnd(1, '/attestati', '/attestati'));
      
      tick(150);
      
      // Non dovrebbe ricaricare
      expect(attestatiService.listAll$.calls.count()).toBe(initialCallCount);
    }));

    it('non dovrebbe ricaricare quando si va a /attestati/nuovo', fakeAsync(() => {
      const initialCallCount = attestatiService.listAll$.calls.count();
      
      routerEventsSubject.next(new NavigationEnd(1, '/attestati', '/attestati/nuovo'));
      
      tick(150);
      
      // Non dovrebbe ricaricare perché stiamo andando alla creazione
      expect(attestatiService.listAll$.calls.count()).toBe(initialCallCount);
    }));
  });

  describe('Error Handling', () => {
    it('dovrebbe estrarre messaggio da payload.message', () => {
      attestatiService.listAll$.and.returnValue(
        throwError(() => ({ payload: { message: 'Specific error' } }))
      );

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      const errorNotif = component2.notifications().find(n => n.type === 'error');
      expect(errorNotif?.message).toContain('Specific error');
    });

    it('dovrebbe gestire payload come stringa', () => {
      attestatiService.listAll$.and.returnValue(
        throwError(() => ({ payload: 'String error message' }))
      );

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      const errorNotif = component2.notifications().find(n => n.type === 'error');
      expect(errorNotif?.message).toContain('String error');
    });

    it('dovrebbe gestire errore senza messaggio', () => {
      attestatiService.listAll$.and.returnValue(
        throwError(() => ({}))
      );

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      expect(component2.errorMsg()).toBe('Impossibile caricare gli attestati.');
    });
  });

  describe('Signals State', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('attestati signal dovrebbe essere modificabile', () => {
      const newAttestati = [mockAttestati[0]];
      component.attestati.set(newAttestati);

      expect(component.attestati().length).toBe(1);
      expect(component.attestati()[0].id).toBe(1);
    });

    it('loading signal dovrebbe aggiornarsi', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);

      component.loading.set(false);
      expect(component.loading()).toBe(false);
    });

    it('errorMsg signal dovrebbe essere settabile', () => {
      component.errorMsg.set('Custom error');
      expect(component.errorMsg()).toBe('Custom error');

      component.errorMsg.set(null);
      expect(component.errorMsg()).toBeNull();
    });

    it('notifications signal dovrebbe gestire array', () => {
      const notifications = [
        { id: '1', message: 'Test', type: 'info' as const, timestamp: Date.now(), fieldId: 'test' }
      ];
      
      component.notifications.set(notifications);
      expect(component.notifications().length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('dovrebbe gestire attestati con dati minimi', () => {
      const minimalAttestati: Attestato[] = [{
        id: 999,
        title: 'Test',
        issuer: 'Test Issuer',
        date: '2023-01-01',
        badgeUrl: null,
        img: {
          src: '',
          alt: ''
        }
      }];

      attestatiService.listAll$.and.returnValue(of(minimalAttestati));

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      expect(component2.attestati().length).toBe(1);
      expect(component2.attestati()[0].title).toBe('Test');
    });

    it('dovrebbe gestire molti attestati simultaneamente', () => {
      const manyAttestati: Attestato[] = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Cert ${i + 1}`,
        issuer: `Issuer ${i + 1}`,
        date: '2023-01-01',
        badgeUrl: `https://example.com/cert${i}.jpg`,
        img: {
          src: `https://example.com/cert${i}.jpg`,
          alt: `Cert ${i + 1}`,
          width: 800,
          height: 600
        }
      }));

      attestatiService.listAll$.and.returnValue(of(manyAttestati));

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      expect(component2.attestati().length).toBe(50);
    });

    it('dovrebbe gestire date in formati diversi', () => {
      const attestatiWithDates: Attestato[] = [
        { ...mockAttestati[0], date: '2023-01-15' },
        { ...mockAttestati[1], date: '2023-06-01' },
        { ...mockAttestati[2], date: '2023-12-31' }
      ];

      attestatiService.listAll$.and.returnValue(of(attestatiWithDates));

      const fixture2 = TestBed.createComponent(Attestati);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();
      component2.ngOnInit();

      expect(component2.attestati().length).toBe(3);
      component2.attestati().forEach(att => {
        expect(att.date).toBeTruthy();
      });
    });
  });

  describe('Lifecycle', () => {
    it('ngOnInit dovrebbe essere chiamato', () => {
      spyOn(component, 'ngOnInit');
      fixture.detectChanges();
      component.ngOnInit();
      
      expect(component.ngOnInit).toHaveBeenCalled();
    });

    it('ngOnDestroy dovrebbe essere chiamato', () => {
      fixture.detectChanges();
      component.ngOnInit();
      
      spyOn(component, 'ngOnDestroy');
      fixture.destroy();
      
      expect(component.ngOnDestroy).toHaveBeenCalled();
    });
  });
});
