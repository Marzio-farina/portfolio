import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../testing/test-utils';
import { App } from './app';
import { AuthService } from './services/auth.service';
import { IdleService } from './services/idle.service';
import { ThemeService } from './services/theme.service';
import { CvUploadModalService } from './services/cv-upload-modal.service';
import { AttestatoDetailModalService } from './services/attestato-detail-modal.service';
import { ProjectDetailModalService } from './services/project-detail-modal.service';
import { CvPreviewModalService } from './services/cv-preview-modal.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { signal } from '@angular/core';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let authService: jasmine.SpyObj<AuthService>;
  let idleService: jasmine.SpyObj<IdleService>;
  let themeService: jasmine.SpyObj<ThemeService>;
  let cvUploadModal: jasmine.SpyObj<CvUploadModalService>;
  let attestatoModal: jasmine.SpyObj<AttestatoDetailModalService>;
  let projectModal: jasmine.SpyObj<ProjectDetailModalService>;
  let cvPreviewModal: jasmine.SpyObj<CvPreviewModalService>;
  let router: jasmine.SpyObj<Router>;
  let route: ActivatedRoute;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['logout', 'isAuthenticated', 'token']);
    const idleSpy = jasmine.createSpyObj('IdleService', ['configure', 'start', 'stop'], {
      onTimeout$: new Subject<unknown>()
    });
    const themeSpy = jasmine.createSpyObj('ThemeService', ['setTheme']);
    const cvUploadSpy = jasmine.createSpyObj('CvUploadModalService', ['close', 'notifyUploadCompleted'], {
      isOpen: signal(false)
    });
    const attestatoSpy = jasmine.createSpyObj('AttestatoDetailModalService', ['close'], {
      isOpen: signal(false),
      selectedAttestato: signal(null)
    });
    const projectSpy = jasmine.createSpyObj('ProjectDetailModalService', ['close'], {
      isOpen: signal(false),
      selectedProject: signal(null)
    });
    const cvPreviewSpy = jasmine.createSpyObj('CvPreviewModalService', ['close'], {
      isOpen: signal(false)
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    authSpy.isAuthenticated.and.returnValue(false);
    authSpy.token.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: AuthService, useValue: authSpy },
        { provide: IdleService, useValue: idleSpy },
        { provide: ThemeService, useValue: themeSpy },
        { provide: CvUploadModalService, useValue: cvUploadSpy },
        { provide: AttestatoDetailModalService, useValue: attestatoSpy },
        { provide: ProjectDetailModalService, useValue: projectSpy },
        { provide: CvPreviewModalService, useValue: cvPreviewSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    idleService = TestBed.inject(IdleService) as jasmine.SpyObj<IdleService>;
    themeService = TestBed.inject(ThemeService) as jasmine.SpyObj<ThemeService>;
    cvUploadModal = TestBed.inject(CvUploadModalService) as jasmine.SpyObj<CvUploadModalService>;
    attestatoModal = TestBed.inject(AttestatoDetailModalService) as jasmine.SpyObj<AttestatoDetailModalService>;
    projectModal = TestBed.inject(ProjectDetailModalService) as jasmine.SpyObj<ProjectDetailModalService>;
    cvPreviewModal = TestBed.inject(CvPreviewModalService) as jasmine.SpyObj<CvPreviewModalService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    route = TestBed.inject(ActivatedRoute);

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ========================================
  // TEST: Component Creation
  // ========================================
  describe('Component Creation', () => {
    it('dovrebbe creare il componente', () => {
      expect(component).toBeTruthy();
    });

    it('dovrebbe avere title signal impostato a "Portfolio"', () => {
      expect(component['title']()).toBe('Portfolio');
    });

    it('dovrebbe inizializzare isLoginOpen a false', () => {
      expect(component.isLoginOpen()).toBe(false);
    });

    it('dovrebbe inizializzare notifications array vuoto', () => {
      expect(component.notifications()).toEqual([]);
    });

    it('dovrebbe inizializzare showMultipleNotifications a false', () => {
      expect(component.showMultipleNotifications()).toBe(false);
    });
  });

  // ========================================
  // TEST: Initialization Methods
  // ========================================
  describe('Initialization Methods', () => {
    it('dovrebbe chiamare configure su IdleService nel constructor', () => {
      expect(idleService.configure).toHaveBeenCalledWith(30 * 60 * 1000);
    });

    it('dovrebbe configurare idle timeout a 30 minuti', () => {
      const expectedTimeout = 30 * 60 * 1000;
      expect(idleService.configure).toHaveBeenCalledWith(expectedTimeout);
    });
  });

  // ========================================
  // TEST: Authentication Effect
  // ========================================
  describe('Authentication Effect', () => {
    it('dovrebbe chiamare idle.start() quando autenticato', fakeAsync(() => {
      authService.isAuthenticated.and.returnValue(true);
      authService.token.and.returnValue('mock-token');
      
      fixture = TestBed.createComponent(App);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick();

      expect(idleService.start).toHaveBeenCalled();
    }));

    it('dovrebbe chiamare idle.stop() quando non autenticato', fakeAsync(() => {
      authService.isAuthenticated.and.returnValue(false);
      
      fixture = TestBed.createComponent(App);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick();

      expect(idleService.stop).toHaveBeenCalled();
    }));

    it('dovrebbe chiudere modal login quando autenticato', fakeAsync(() => {
      component.isLoginOpen.set(true);
      authService.isAuthenticated.and.returnValue(true);
      
      fixture.detectChanges();
      tick();

      expect(component.isLoginOpen()).toBe(false);
    }));
  });

  // ========================================
  // TEST: Idle Timeout Handling
  // ========================================
  describe('Idle Timeout Handling', () => {
    it('dovrebbe gestire timeout di idle', fakeAsync(() => {
      const timeoutSubject = idleService.onTimeout$ as Subject<unknown>;
      
      timeoutSubject.next();
      tick();

      expect(authService.logout).toHaveBeenCalled();
      expect(component.isLoginOpen()).toBe(true);
    }));

    it('dovrebbe aggiungere notifica di warning su idle timeout', fakeAsync(() => {
      const timeoutSubject = idleService.onTimeout$ as Subject<unknown>;
      
      timeoutSubject.next();
      tick();

      const notifications = component.notifications();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].message).toContain('inattività');
    }));
  });

  // ========================================
  // TEST: Login Modal Management
  // ========================================
  describe('Login Modal Management', () => {
    it('openLogin dovrebbe impostare isLoginOpen a true', () => {
      component.openLogin();
      expect(component.isLoginOpen()).toBe(true);
    });

    it('closeLogin dovrebbe impostare isLoginOpen a false', () => {
      component.isLoginOpen.set(true);
      component.closeLogin();
      expect(component.isLoginOpen()).toBe(false);
    });
  });

  // ========================================
  // TEST: CV Upload Modal
  // ========================================
  describe('CV Upload Modal', () => {
    it('onCvUploaded dovrebbe notificare e chiudere modal', () => {
      component.onCvUploaded();
      
      expect(cvUploadModal.notifyUploadCompleted).toHaveBeenCalled();
      expect(cvUploadModal.close).toHaveBeenCalled();
    });

    it('onCvUploadCancelled dovrebbe chiudere modal', () => {
      component.onCvUploadCancelled();
      
      expect(cvUploadModal.close).toHaveBeenCalled();
    });
  });

  // ========================================
  // TEST: Attestato Detail Modal
  // ========================================
  describe('Attestato Detail Modal', () => {
    it('onAttestatoDetailClosed dovrebbe chiudere modal', () => {
      component.onAttestatoDetailClosed();
      
      expect(attestatoModal.close).toHaveBeenCalled();
    });
  });

  // ========================================
  // TEST: Project Detail Modal
  // ========================================
  describe('Project Detail Modal', () => {
    it('onProjectDetailClosed dovrebbe chiudere modal', () => {
      component.onProjectDetailClosed();
      
      expect(projectModal.close).toHaveBeenCalled();
    });
  });

  // ========================================
  // TEST: Auth Button Click
  // ========================================
  describe('Auth Button Click', () => {
    it('dovrebbe eseguire logout quando autenticato', () => {
      authService.isAuthenticated.and.returnValue(true);
      component.isLoginOpen.set(true);
      
      component.onAuthButtonClick();
      
      expect(authService.logout).toHaveBeenCalled();
      expect(component.isLoginOpen()).toBe(false);
    });

    it('dovrebbe aprire login quando non autenticato', () => {
      authService.isAuthenticated.and.returnValue(false);
      
      component.onAuthButtonClick();
      
      expect(component.isLoginOpen()).toBe(true);
    });
  });

  // ========================================
  // TEST: Keyboard Events (Esc)
  // ========================================
  describe('Keyboard Events', () => {
    it('dovrebbe chiudere login modal con tasto Esc', () => {
      component.isLoginOpen.set(true);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyboardEvent(event);
      
      expect(component.isLoginOpen()).toBe(false);
    });

    it('dovrebbe chiudere attestato modal con tasto Esc', () => {
      attestatoModal.isOpen.and.returnValue(true);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyboardEvent(event);
      
      expect(attestatoModal.close).toHaveBeenCalled();
    });

    it('dovrebbe chiudere project modal con tasto Esc', () => {
      projectModal.isOpen.and.returnValue(true);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyboardEvent(event);
      
      expect(projectModal.close).toHaveBeenCalled();
    });

    it('dovrebbe chiudere CV upload modal con tasto Esc', () => {
      cvUploadModal.isOpen.and.returnValue(true);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyboardEvent(event);
      
      expect(cvUploadModal.close).toHaveBeenCalled();
    });

    it('NON dovrebbe reagire ad altri tasti', () => {
      component.isLoginOpen.set(true);
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyboardEvent(event);
      
      expect(component.isLoginOpen()).toBe(true);
    });
  });

  // ========================================
  // TEST: Notifications Management
  // ========================================
  describe('Notifications Management', () => {
    it('dovrebbe aggiungere una notifica', fakeAsync(() => {
      component['addNotification']('Test message', 'info');
      tick();
      
      const notifications = component.notifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe('Test message');
      expect(notifications[0].type).toBe('info');
    }));

    it('dovrebbe impostare showMultipleNotifications a true quando aggiunta notifica', fakeAsync(() => {
      component['addNotification']('Test', 'success');
      tick();
      
      expect(component.showMultipleNotifications()).toBe(true);
    }));

    it('dovrebbe rimuovere notifica dopo 5 secondi', fakeAsync(() => {
      component['addNotification']('Test', 'info');
      tick();
      
      expect(component.notifications().length).toBe(1);
      
      tick(5000);
      
      expect(component.notifications().length).toBe(0);
    }));

    it('dovrebbe rimuovere notifica per ID', () => {
      component['addNotification']('Test 1', 'info');
      component['addNotification']('Test 2', 'success');
      
      const notifications = component.notifications();
      const firstId = notifications[0].id;
      
      component['removeNotification'](firstId);
      
      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].message).toBe('Test 2');
    });

    it('dovrebbe impostare showMultipleNotifications a false quando tutte rimosse', () => {
      component['addNotification']('Test', 'info');
      const id = component.notifications()[0].id;
      
      component['removeNotification'](id);
      
      expect(component.showMultipleNotifications()).toBe(false);
    });

    it('getMostSevereNotification dovrebbe ritornare null se lista vuota', () => {
      const result = component.getMostSevereNotification();
      expect(result).toBeNull();
    });

    it('getMostSevereNotification dovrebbe ritornare notifica più grave', () => {
      component['addNotification']('Info msg', 'info');
      component['addNotification']('Error msg', 'error');
      component['addNotification']('Success msg', 'success');
      
      const severe = component.getMostSevereNotification();
      
      expect(severe).toBeTruthy();
      expect(severe?.type).toBe('error');
      expect(severe?.message).toBe('Error msg');
    });

    it('getMostSevereNotification dovrebbe gestire ordine: error > warning > info > success', () => {
      component['addNotification']('Warning', 'warning');
      component['addNotification']('Info', 'info');
      
      let severe = component.getMostSevereNotification();
      expect(severe?.type).toBe('warning');
      
      component['addNotification']('Error', 'error');
      severe = component.getMostSevereNotification();
      expect(severe?.type).toBe('error');
    });
  });

  // ========================================
  // TEST: Computed Properties
  // ========================================
  describe('Computed Properties', () => {
    it('isAuthed dovrebbe derivare da auth.token()', () => {
      authService.token.and.returnValue(null);
      expect(component.isAuthed()).toBe(false);
      
      authService.token.and.returnValue('mock-token');
      fixture.detectChanges();
      expect(component.isAuthed()).toBe(true);
    });

    it('isCvUploadModalOpen dovrebbe derivare dal servizio', () => {
      cvUploadModal.isOpen.and.returnValue(false);
      expect(component.isCvUploadModalOpen()).toBe(false);
      
      cvUploadModal.isOpen.and.returnValue(true);
      expect(component.isCvUploadModalOpen()).toBe(true);
    });

    it('isAttestatoDetailModalOpen dovrebbe derivare dal servizio', () => {
      attestatoModal.isOpen.and.returnValue(false);
      expect(component.isAttestatoDetailModalOpen()).toBe(false);
      
      attestatoModal.isOpen.and.returnValue(true);
      expect(component.isAttestatoDetailModalOpen()).toBe(true);
    });

    it('isProjectDetailModalOpen dovrebbe derivare dal servizio', () => {
      projectModal.isOpen.and.returnValue(false);
      expect(component.isProjectDetailModalOpen()).toBe(false);
      
      projectModal.isOpen.and.returnValue(true);
      expect(component.isProjectDetailModalOpen()).toBe(true);
    });

    it('isCvPreviewModalOpen dovrebbe derivare dal servizio', () => {
      cvPreviewModal.isOpen.and.returnValue(false);
      expect(component.isCvPreviewModalOpen()).toBe(false);
      
      cvPreviewModal.isOpen.and.returnValue(true);
      expect(component.isCvPreviewModalOpen()).toBe(true);
    });
  });

  // ========================================
  // TEST: Body Scroll Lock Effect
  // ========================================
  describe('Body Scroll Lock Effect', () => {
    it('dovrebbe bloccare scroll quando modal aperto', () => {
      component.isLoginOpen.set(true);
      fixture.detectChanges();
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('dovrebbe sbloccare scroll quando modal chiuso', () => {
      component.isLoginOpen.set(true);
      fixture.detectChanges();
      
      component.isLoginOpen.set(false);
      fixture.detectChanges();
      
      expect(document.body.style.overflow).toBe('');
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire multipli open/close login rapidi', () => {
      for (let i = 0; i < 10; i++) {
        component.openLogin();
        expect(component.isLoginOpen()).toBe(true);
        component.closeLogin();
        expect(component.isLoginOpen()).toBe(false);
      }
    });

    it('dovrebbe gestire multiple notifiche simultanee', fakeAsync(() => {
      for (let i = 0; i < 5; i++) {
        component['addNotification'](`Message ${i}`, 'info');
      }
      tick();
      
      expect(component.notifications().length).toBe(5);
      
      tick(5000);
      
      expect(component.notifications().length).toBe(0);
    }));

    it('dovrebbe gestire rimozione notifica inesistente', () => {
      expect(() => {
        component['removeNotification']('non-existent-id');
      }).not.toThrow();
    });
  });

  // ========================================
  // TEST: Integration Tests
  // ========================================
  describe('Integration Tests', () => {
    it('workflow: idle timeout → logout → notifica → login modal', fakeAsync(() => {
      const timeoutSubject = idleService.onTimeout$ as Subject<unknown>;
      
      timeoutSubject.next();
      tick();

      expect(authService.logout).toHaveBeenCalled();
      expect(component.isLoginOpen()).toBe(true);
      expect(component.notifications().length).toBeGreaterThan(0);
      expect(component.showMultipleNotifications()).toBe(true);
    }));

    it('workflow: auth button quando autenticato → logout e chiudi modal', () => {
      authService.isAuthenticated.and.returnValue(true);
      component.isLoginOpen.set(true);
      
      component.onAuthButtonClick();
      
      expect(authService.logout).toHaveBeenCalled();
      expect(component.isLoginOpen()).toBe(false);
    });

    it('workflow: CV upload → notifica → chiudi', () => {
      component.onCvUploaded();
      
      expect(cvUploadModal.notifyUploadCompleted).toHaveBeenCalled();
      expect(cvUploadModal.close).toHaveBeenCalled();
    });
  });
});
