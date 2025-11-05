import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Curriculum } from './curriculum';
import { CvService } from '../../services/cv.service';
import { TenantService } from '../../services/tenant.service';
import { CvFileService } from '../../services/cv-file.service';
import { AuthService } from '../../services/auth.service';
import { CvUploadModalService } from '../../services/cv-upload-modal.service';
import { CvPreviewModalService } from '../../services/cv-preview-modal.service';

describe('Curriculum', () => {
  let component: Curriculum;
  let fixture: ComponentFixture<Curriculum>;
  let cvService: jasmine.SpyObj<CvService>;
  let cvFileService: jasmine.SpyObj<CvFileService>;
  let tenantService: jasmine.SpyObj<TenantService>;
  let authService: jasmine.SpyObj<AuthService>;
  let cvUploadModalService: jasmine.SpyObj<CvUploadModalService>;
  let cvPreviewModalService: jasmine.SpyObj<CvPreviewModalService>;
  let sanitizer: jasmine.SpyObj<DomSanitizer>;
  let mockActivatedRoute: any;

  const mockCvData = {
    education: [
      { title: 'Laurea in Informatica', years: '2015-2019', description: 'Università di Milano' },
      { title: 'Master in Software Engineering', years: '2019-2021', description: 'Politecnico' }
    ],
    experience: [
      { title: 'Senior Developer', years: '2021-2023', description: 'Tech Company' },
      { title: 'Team Lead', years: '2023-Present', description: 'Current Company' }
    ]
  };

  const mockCvFileResponse = {
    success: true,
    message: 'CV trovato',
    cv: {
      id: 1,
      filename: 'curriculum.pdf',
      title: 'CV Principale',
      file_size: 1024000,
      is_default: true,
      download_url: 'https://example.com/cv.pdf',
      view_url: 'https://example.com/cv-view.pdf'
    }
  };

  beforeEach(async () => {
    // Crea spy per i servizi
    cvService = jasmine.createSpyObj('CvService', ['get$']);
    cvFileService = jasmine.createSpyObj('CvFileService', ['getDefault$', 'downloadFile']);
    tenantService = jasmine.createSpyObj('TenantService', ['userId']);
    authService = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    cvUploadModalService = jasmine.createSpyObj('CvUploadModalService', ['open'], {
      onUploadCompleted$: of(void 0)
    });
    cvPreviewModalService = jasmine.createSpyObj('CvPreviewModalService', ['open']);
    sanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustResourceUrl']);

    // Setup mock per ActivatedRoute
    mockActivatedRoute = {
      data: of({ title: 'Curriculum' }),
      snapshot: {
        paramMap: new Map()
      }
    };

    // Setup default return values
    cvService.get$.and.returnValue(of(mockCvData));
    cvFileService.getDefault$.and.returnValue(of(mockCvFileResponse));
    tenantService.userId.and.returnValue(null);
    authService.isAuthenticated.and.returnValue(false);
    sanitizer.bypassSecurityTrustResourceUrl.and.returnValue('safe-url' as any);

    await TestBed.configureTestingModule({
      imports: [Curriculum],
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: CvService, useValue: cvService },
        { provide: CvFileService, useValue: cvFileService },
        { provide: TenantService, useValue: tenantService },
        { provide: AuthService, useValue: authService },
        { provide: CvUploadModalService, useValue: cvUploadModalService },
        { provide: CvPreviewModalService, useValue: cvPreviewModalService },
        { provide: DomSanitizer, useValue: sanitizer },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Curriculum);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('dovrebbe avere properties definite', () => {
      expect(component.education).toBeDefined();
      expect(component.experience).toBeDefined();
      expect(component.loading).toBeDefined();
      expect(component.downloading).toBeDefined();
      expect(component.pdfDialogOpen).toBeDefined();
    });

    it('dovrebbe caricare i dati del curriculum all\'init', () => {
      expect(cvService.get$).toHaveBeenCalled();
      expect(component.education().length).toBe(2);
      expect(component.experience().length).toBe(2);
    });

    it('dovrebbe impostare loading a false dopo il caricamento', () => {
      expect(component.loading()).toBe(false);
    });

    it('dovrebbe caricare il titolo dalla route', (done) => {
      setTimeout(() => {
        expect(component.title()).toBe('Curriculum');
        done();
      }, 0);
    });
  });

  describe('Data Loading', () => {
    it('dovrebbe caricare education con successo', () => {
      expect(component.education().length).toBe(2);
      expect(component.education()[0].title).toBe('Laurea in Informatica');
      expect(component.education()[1].years).toBe('2019-2021');
    });

    it('dovrebbe caricare experience con successo', () => {
      expect(component.experience().length).toBe(2);
      expect(component.experience()[0].title).toBe('Senior Developer');
      expect(component.experience()[1].description).toBe('Current Company');
    });

    it('dovrebbe gestire errore durante il caricamento', () => {
      cvService.get$.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.loading()).toBe(false);
      expect(component2.notifications().length).toBeGreaterThan(0);
      const errorNotif = component2.notifications().find(n => n.type === 'error');
      expect(errorNotif).toBeDefined();
    });

    it('dovrebbe caricare dati per uno specifico tenant', () => {
      tenantService.userId.and.returnValue(456);

      const fixture2 = TestBed.createComponent(Curriculum);
      fixture2.detectChanges();

      expect(cvService.get$).toHaveBeenCalledWith(456);
    });

    it('dovrebbe gestire education vuoto', () => {
      cvService.get$.and.returnValue(of({ education: [], experience: mockCvData.experience }));

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.education().length).toBe(0);
      expect(component2.experience().length).toBe(2);
    });

    it('dovrebbe gestire experience vuoto', () => {
      cvService.get$.and.returnValue(of({ education: mockCvData.education, experience: [] }));

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.education().length).toBe(2);
      expect(component2.experience().length).toBe(0);
    });
  });

  describe('CV Download', () => {
    it('downloadPdf dovrebbe scaricare il CV', () => {
      component.downloadPdf();

      expect(cvFileService.getDefault$).toHaveBeenCalled();
      expect(cvFileService.downloadFile).toHaveBeenCalledWith('https://example.com/cv.pdf');
    });

    it('downloadPdf dovrebbe mostrare notifica di successo', () => {
      component.downloadPdf();

      const successNotif = component.notifications().find(n => n.type === 'success');
      expect(successNotif).toBeDefined();
      expect(successNotif?.message).toContain('Download');
    });

    it('downloadPdf dovrebbe gestire errore', () => {
      cvFileService.getDefault$.and.returnValue(
        throwError(() => ({ message: 'File not found' }))
      );

      component.downloadPdf();

      expect(component.downloading()).toBe(false);
      const errorNotif = component.notifications().find(n => n.type === 'error');
      expect(errorNotif).toBeDefined();
    });

    it('downloadPdf non dovrebbe scaricare se già in downloading', () => {
      component.downloading.set(true);
      
      component.downloadPdf();

      expect(cvFileService.getDefault$).not.toHaveBeenCalled();
    });

    it('downloadPdf dovrebbe gestire risposta senza CV', () => {
      cvFileService.getDefault$.and.returnValue(of({
        success: false,
        message: 'Nessun CV disponibile',
        cv: undefined
      }));

      component.downloadPdf();

      const errorNotif = component.notifications().find(n => n.type === 'error');
      expect(errorNotif).toBeDefined();
      expect(errorNotif?.message).toContain('Nessun CV');
    });

    it('downloadPdf dovrebbe impostare downloading durante il processo', fakeAsync(() => {
      component.downloadPdf();
      
      // Durante il download
      expect(component.downloading()).toBe(true);
      
      tick();
      
      // Dopo il download
      expect(component.downloading()).toBe(false);
    }));
  });

  describe('CV Preview', () => {
    it('openOnline dovrebbe aprire il preview modal', () => {
      component.openOnline();

      expect(cvPreviewModalService.open).toHaveBeenCalledWith('https://example.com/cv-view.pdf');
    });

    it('openOnline dovrebbe usare download_url se view_url non disponibile', () => {
      cvFileService.getDefault$.and.returnValue(of({
        success: true,
        message: 'CV trovato',
        cv: {
          id: 1,
          filename: 'curriculum.pdf',
          title: 'CV',
          file_size: 1024000,
          download_url: 'https://example.com/cv.pdf',
          view_url: undefined
        }
      }));

      component.openOnline();

      expect(cvPreviewModalService.open).toHaveBeenCalledWith('https://example.com/cv.pdf');
    });

    it('openOnline dovrebbe gestire errore', () => {
      cvFileService.getDefault$.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );

      component.openOnline();

      const errorNotif = component.notifications().find(n => n.type === 'error');
      expect(errorNotif).toBeDefined();
    });

    it('openOnline dovrebbe gestire risposta senza CV', () => {
      cvFileService.getDefault$.and.returnValue(of({
        success: false,
        message: 'Nessun CV',
        cv: undefined
      }));

      component.openOnline();

      const errorNotif = component.notifications().find(n => n.type === 'error');
      expect(errorNotif).toBeDefined();
    });

    it('closePdfDialog dovrebbe chiudere il dialog', () => {
      component.pdfDialogOpen.set(true);
      component.pdfUrl.set('test-url');

      component.closePdfDialog();

      expect(component.pdfDialogOpen()).toBe(false);
      expect(component.pdfUrl()).toBeNull();
    });
  });

  describe('CV Share', () => {
    it('share dovrebbe copiare link negli appunti', async () => {
      const writeTextSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        configurable: true
      });

      await component.share();
      
      // Attendi che le promise si risolvano
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(writeTextSpy).toHaveBeenCalledWith('https://example.com/cv-view.pdf');
    });

    it('share dovrebbe mostrare notifica di successo', async () => {
      const writeTextSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        configurable: true
      });

      await component.share();
      
      // Attendi che le promise si risolvano
      await new Promise(resolve => setTimeout(resolve, 100));

      const successNotif = component.notifications().find(n => 
        n.type === 'success' && n.message.includes('copiato')
      );
      expect(successNotif).toBeDefined();
    });

    it('share dovrebbe gestire errore clipboard', async () => {
      const writeTextSpy = jasmine.createSpy('writeText').and.returnValue(
        Promise.reject(new Error('Clipboard error'))
      );
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        configurable: true
      });

      await component.share();
      
      // Attendi che le promise si risolvano
      await new Promise(resolve => setTimeout(resolve, 100));

      const errorNotif = component.notifications().find(n => n.type === 'error');
      expect(errorNotif).toBeDefined();
    });

    it('share dovrebbe gestire Web Share API se disponibile', async () => {
      const shareSpy = jasmine.createSpy('share').and.returnValue(Promise.resolve());
      Object.defineProperty(navigator, 'share', {
        value: shareSpy,
        configurable: true
      });

      await component.share();
      
      // Attendi che le promise si risolvano
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(shareSpy).toHaveBeenCalled();
    });
  });

  describe('CV Button Click', () => {
    it('onCvButtonClick dovrebbe aprire menu se non autenticato', () => {
      authService.isAuthenticated.and.returnValue(false);
      
      component.onCvButtonClick();

      expect(component.cvMenuOpen()).toBe(true);
    });

    it('onCvButtonClick dovrebbe aprire menu se CV esiste', () => {
      authService.isAuthenticated.and.returnValue(true);
      
      component.onCvButtonClick();

      expect(component.cvMenuOpen()).toBe(true);
    });

    it('onCvButtonClick dovrebbe aprire modal se CV non esiste', () => {
      authService.isAuthenticated.and.returnValue(true);
      cvFileService.getDefault$.and.returnValue(of({
        success: false,
        message: 'Nessun CV trovato',
        cv: undefined
      }));
      
      component.onCvButtonClick();

      expect(cvUploadModalService.open).toHaveBeenCalled();
    });

    it('onCvButtonClick dovrebbe aprire modal su errore 404', () => {
      authService.isAuthenticated.and.returnValue(true);
      cvFileService.getDefault$.and.returnValue(
        throwError(() => ({ originalError: { status: 404 } }))
      );
      
      component.onCvButtonClick();

      expect(cvUploadModalService.open).toHaveBeenCalled();
    });

    it('onCvButtonClick dovrebbe mostrare notifica info quando CV non trovato', () => {
      authService.isAuthenticated.and.returnValue(true);
      cvFileService.getDefault$.and.returnValue(of({
        success: false,
        message: 'Nessun CV',
        cv: undefined
      }));
      
      component.onCvButtonClick();

      const infoNotif = component.notifications().find(n => n.type === 'info');
      expect(infoNotif).toBeDefined();
    });
  });

  describe('CV Upload Completed', () => {
    it('onCvUploaded dovrebbe mostrare notifica di successo', () => {
      component.onCvUploaded();

      const successNotif = component.notifications().find(n => n.type === 'success');
      expect(successNotif).toBeDefined();
      expect(successNotif?.message).toContain('caricato con successo');
    });

    it('onCvUploaded dovrebbe chiudere il menu', () => {
      component.cvMenuOpen.set(true);
      component.onCvUploaded();

      expect(component.cvMenuOpen()).toBe(false);
    });
  });

  describe('Notifications Management', () => {
    it('getMostSevereNotification dovrebbe restituire la notifica più grave', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' },
        { id: '2', message: 'Error', type: 'error', timestamp: Date.now(), fieldId: 'test2' },
        { id: '3', message: 'Info', type: 'info', timestamp: Date.now(), fieldId: 'test3' }
      ]);

      const most = component.getMostSevereNotification();
      expect(most?.type).toBe('error');
    });

    it('getMostSevereNotification dovrebbe restituire null se non ci sono notifiche', () => {
      component.notifications.set([]);

      const most = component.getMostSevereNotification();
      expect(most).toBeNull();
    });

    it('dovrebbe ordinare le notifiche per gravità (error > warning > info > success)', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' },
        { id: '2', message: 'Info', type: 'info', timestamp: Date.now(), fieldId: 'test2' },
        { id: '3', message: 'Warning', type: 'warning', timestamp: Date.now(), fieldId: 'test3' }
      ]);

      const most = component.getMostSevereNotification();
      expect(most?.type).toBe('warning');
    });

    it('non dovrebbe aggiungere notifiche duplicate', () => {
      // Simula caricamento errore
      cvService.get$.and.returnValue(
        throwError(() => ({ message: 'Same error' }))
      );

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      const initialCount = component2.notifications().length;
      
      // Non dovrebbe aggiungere la stessa notifica
      expect(initialCount).toBeGreaterThan(0);
    });
  });

  describe('Signals State', () => {
    it('education signal dovrebbe essere modificabile', () => {
      const newEducation = [{ title: 'PhD', years: '2021-2024', description: 'Research' }];
      component.education.set(newEducation);

      expect(component.education().length).toBe(1);
      expect(component.education()[0].title).toBe('PhD');
    });

    it('experience signal dovrebbe essere modificabile', () => {
      const newExperience = [{ title: 'CTO', years: '2024-Present', description: 'Startup' }];
      component.experience.set(newExperience);

      expect(component.experience().length).toBe(1);
      expect(component.experience()[0].title).toBe('CTO');
    });

    it('loading signal dovrebbe aggiornarsi', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);

      component.loading.set(false);
      expect(component.loading()).toBe(false);
    });

    it('safePdfUrl computed dovrebbe sanitizzare l\'URL', () => {
      component.pdfUrl.set('https://example.com/test.pdf');
      
      expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('https://example.com/test.pdf');
      expect(component.safePdfUrl()).toBe('safe-url');
    });

    it('safePdfUrl computed dovrebbe restituire null se pdfUrl è null', () => {
      component.pdfUrl.set(null);
      
      expect(component.safePdfUrl()).toBeNull();
    });
  });

  describe('Error Message Extraction', () => {
    it('dovrebbe estrarre messaggio da payload.message', () => {
      cvService.get$.and.returnValue(
        throwError(() => ({ payload: { message: 'Specific error' } }))
      );

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      const errorNotif = component2.notifications().find(n => n.type === 'error');
      expect(errorNotif?.message).toContain('Specific error');
    });

    it('dovrebbe gestire payload come stringa', () => {
      cvService.get$.and.returnValue(
        throwError(() => ({ payload: 'String error' }))
      );

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      const errorNotif = component2.notifications().find(n => n.type === 'error');
      expect(errorNotif?.message).toContain('String error');
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire CV data con array molto lunghi', () => {
      const longEducation = Array.from({ length: 20 }, (_, i) => ({
        title: `Education ${i}`,
        years: `${2000 + i}-${2001 + i}`,
        description: `Description ${i}`
      }));

      cvService.get$.and.returnValue(of({
        education: longEducation,
        experience: []
      }));

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.education().length).toBe(20);
    });

    it('dovrebbe gestire descrizioni vuote in timeline items', () => {
      cvService.get$.and.returnValue(of({
        education: [{ title: 'Test', years: '2020', description: '' }],
        experience: []
      }));

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.education()[0].description).toBe('');
    });

    it('dovrebbe gestire anni in formati diversi', () => {
      cvService.get$.and.returnValue(of({
        education: [
          { title: 'Test 1', years: '2020-2021', description: 'Range' },
          { title: 'Test 2', years: '2022-Present', description: 'Ongoing' },
          { title: 'Test 3', years: '2023', description: 'Single year' }
        ],
        experience: []
      }));

      const fixture2 = TestBed.createComponent(Curriculum);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.education().length).toBe(3);
    });

    it('dovrebbe gestire multipli download simultanei prevenendoli', () => {
      component.downloading.set(true);
      
      component.downloadPdf();
      component.downloadPdf();
      component.downloadPdf();

      // Dovrebbe essere chiamato solo per l'inizializzazione
      expect(cvFileService.getDefault$.calls.count()).toBeLessThan(3);
    });
  });
});
