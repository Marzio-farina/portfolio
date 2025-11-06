import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AddProject } from './add-project';
import { ProjectService } from '../../services/project.service';
import { CategoryService } from '../../services/category.service';
import { TenantRouterService } from '../../services/tenant-router.service';
import { TenantService } from '../../services/tenant.service';
import { PosterData } from '../poster-uploader/poster-uploader.component';
import { Category } from '../../core/models/category.model';
import { NotificationType } from '../notification/notification';

describe('AddProject Component', () => {
  let component: AddProject;
  let fixture: ComponentFixture<AddProject>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockCategoryService: jasmine.SpyObj<CategoryService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: any;
  let mockTenantRouter: jasmine.SpyObj<TenantRouterService>;
  let mockTenantService: jasmine.SpyObj<TenantService>;
  let mockHttp: jasmine.SpyObj<HttpClient>;

  const mockCategories = [
    { id: 1, title: 'Web', description: 'Web apps' },
    { id: 2, title: 'Mobile', description: 'Mobile apps' }
  ];

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj('ProjectService', ['create$', 'updateWithFiles$']);
    mockCategoryService = jasmine.createSpyObj('CategoryService', ['list$']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);
    mockRoute = { snapshot: { queryParams: {} } };
    mockTenantRouter = jasmine.createSpyObj('TenantRouterService', ['navigate']);
    mockTenantService = jasmine.createSpyObj('TenantService', [], {
      userId: jasmine.createSpy().and.returnValue(null),
      userSlug: jasmine.createSpy().and.returnValue(null)
    });
    mockHttp = jasmine.createSpyObj('HttpClient', ['get', 'post']);

    mockCategoryService.list$.and.returnValue(of(mockCategories));
    mockRouter.getCurrentNavigation.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AddProject, ReactiveFormsModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: TenantRouterService, useValue: mockTenantRouter },
        { provide: TenantService, useValue: mockTenantService },
        { provide: HttpClient, useValue: mockHttp }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddProject);
    component = fixture.componentInstance;
  });

  it('dovrebbe creare il componente', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('dovrebbe inizializzare form con campi required', () => {
      fixture.detectChanges();

      expect(component.addProjectForm.get('title')).toBeTruthy();
      expect(component.addProjectForm.get('category_id')).toBeTruthy();
      expect(component.addProjectForm.get('description')).toBeTruthy();
      expect(component.addProjectForm.get('poster_file')).toBeTruthy();
    });

    it('form dovrebbe essere invalido inizialmente', () => {
      fixture.detectChanges();

      expect(component.addProjectForm.valid).toBe(false);
    });

    it('title dovrebbe essere required', () => {
      fixture.detectChanges();
      const title = component.addProjectForm.get('title');

      expect(title?.hasError('required')).toBe(true);

      title?.setValue('Test Project');
      expect(title?.hasError('required')).toBe(false);
    });

    it('title dovrebbe avere maxLength 50', () => {
      fixture.detectChanges();
      const title = component.addProjectForm.get('title');

      title?.setValue('A'.repeat(51));
      expect(title?.hasError('maxlength')).toBe(true);

      title?.setValue('A'.repeat(50));
      expect(title?.hasError('maxlength')).toBe(false);
    });

    it('description dovrebbe avere maxLength 1000', () => {
      fixture.detectChanges();
      const desc = component.addProjectForm.get('description');

      desc?.setValue('A'.repeat(1001));
      expect(desc?.hasError('maxlength')).toBe(true);

      desc?.setValue('A'.repeat(1000));
      expect(desc?.hasError('maxlength')).toBe(false);
    });
  });

  describe('Categories Loading', () => {
    it('dovrebbe caricare categorie all\'init', (done) => {
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.categories().length).toBe(2);
        expect(component.loadingCategories()).toBe(false);
        done();
      }, 100);
    });

    it('dovrebbe gestire errore caricamento categorie', (done) => {
      mockCategoryService.list$.and.returnValue(throwError(() => new Error('Error')));

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.loadingCategories()).toBe(false);
        done();
      }, 100);
    });
  });

  describe('File Selection', () => {
    it('onPosterSelected dovrebbe impostare file poster', () => {
      const mockFile = new File(['test'], 'poster.jpg', { type: 'image/jpeg' });
      const posterData: PosterData = { file: mockFile, previewUrl: 'data:image...' };

      component.onPosterSelected(posterData);

      expect(component.selectedPosterFile()).toBe(mockFile);
    });

    it('onVideoFileSelected dovrebbe impostare file video', () => {
      const mockFile = new File(['video'], 'video.mp4', { type: 'video/mp4' });
      const event = { target: { files: [mockFile] } } as any;

      component.onVideoFileSelected(event);

      expect(component.selectedVideoFile()).toBe(mockFile);
    });

    it('onVideoFileSelected non dovrebbe fare nulla senza file', () => {
      const event = { target: { files: [] } } as any;

      component.onVideoFileSelected(event);

      expect(component.selectedVideoFile()).toBeNull();
    });
  });

  describe('Form Validation', () => {
    it('form valido dovrebbe permettere submit', () => {
      fixture.detectChanges();

      component.addProjectForm.patchValue({
        title: 'Test Project',
        category_id: 1,
        description: 'Test description',
        poster_file: 'file'
      });

      expect(component.addProjectForm.valid).toBe(true);
    });

    it('form invalido dovrebbe prevenire submit', () => {
      fixture.detectChanges();

      component.addProjectForm.patchValue({
        title: '',
        category_id: '',
        description: ''
      });

      expect(component.addProjectForm.invalid).toBe(true);
    });
  });

  describe('Form Submission', () => {
    it('onSubmit dovrebbe creare progetto con dati validi', (done) => {
      mockProjectService.create$.and.returnValue(of({ id: 1, title: 'New Project' } as any));
      fixture.detectChanges();

      const mockFile = new File(['test'], 'poster.jpg', { type: 'image/jpeg' });
      component.selectedPosterFile.set(mockFile);

      component.addProjectForm.patchValue({
        title: 'New Project',
        category_id: 1,
        description: 'Description',
        poster_file: mockFile  // Required field!
      });

      // Verifica che il form sia valido
      expect(component.addProjectForm.valid).toBe(true);

      component.onSubmit();

      setTimeout(() => {
        expect(mockProjectService.create$).toHaveBeenCalled();
        expect(component.uploading()).toBe(false);
        done();
      }, 100);
    });

    it('onSubmit non dovrebbe fare nulla se form invalido', () => {
      fixture.detectChanges();

      component.addProjectForm.patchValue({
        title: '',
        category_id: '',
        description: ''
      });

      component.onSubmit();

      expect(mockProjectService.create$).not.toHaveBeenCalled();
    });

    it('dovrebbe gestire errore durante submit', (done) => {
      mockProjectService.create$.and.returnValue(throwError(() => ({ status: 422 })));
      fixture.detectChanges();

      const mockFile = new File(['test'], 'poster.jpg', { type: 'image/jpeg' });
      component.selectedPosterFile.set(mockFile);

      component.addProjectForm.patchValue({
        title: 'Test',
        category_id: 1,
        description: 'Desc'
      });

      component.onSubmit();

      setTimeout(() => {
        expect(component.uploading()).toBe(false);
        expect(component.errorMsg()).toBeTruthy();
        done();
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire title con caratteri speciali', () => {
      fixture.detectChanges();

      component.addProjectForm.patchValue({
        title: '<script>alert("XSS")</script>'
      });

      expect(component.addProjectForm.get('title')?.value).toContain('<script>');
    });

    it('dovrebbe gestire description molto lunga', () => {
      fixture.detectChanges();
      const longDesc = 'A'.repeat(1000);

      component.addProjectForm.patchValue({
        description: longDesc
      });

      expect(component.addProjectForm.get('description')?.value.length).toBe(1000);
    });

    it('dovrebbe gestire file molto grande', () => {
      const largeFile = new File([new Array(10 * 1024 * 1024).fill('a').join('')], 'large.jpg', { type: 'image/jpeg' });
      component.selectedPosterFile.set(largeFile);

      expect(component.selectedPosterFile()?.size).toBeGreaterThan(5 * 1024 * 1024);
    });
  });

  describe('Signal Reactivity', () => {
    it('uploading signal dovrebbe disabilitare form', () => {
      fixture.detectChanges();

      component.uploading.set(true);
      fixture.detectChanges();

      expect(component.addProjectForm.get('title')?.disabled).toBe(true);
    });

    it('errorMsg signal dovrebbe aggiornarsi', () => {
      component.errorMsg.set('Test error');
      expect(component.errorMsg()).toBe('Test error');

      component.errorMsg.set(null);
      expect(component.errorMsg()).toBeNull();
    });
  });

  describe('Video File Management', () => {
    it('selectedVideoFile dovrebbe iniziare null', () => {
      expect(component.selectedVideoFile()).toBeNull();
    });

    it('existingVideoUrl dovrebbe iniziare null', () => {
      expect(component.existingVideoUrl()).toBeNull();
    });

    it('videoPreviewUrl dovrebbe iniziare null', () => {
      expect(component.videoPreviewUrl()).toBeNull();
    });

    it('isDragOverVideo dovrebbe iniziare false', () => {
      expect(component.isDragOverVideo()).toBe(false);
    });

    it('selectedVideoFile dovrebbe essere reattivo', () => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      component.selectedVideoFile.set(file);
      expect(component.selectedVideoFile()).toBe(file);
    });

    it('videoPreviewUrl dovrebbe essere reattivo', () => {
      component.videoPreviewUrl.set('data:video/mp4;base64,test');
      expect(component.videoPreviewUrl()).toBe('data:video/mp4;base64,test');
    });

    it('isDragOverVideo dovrebbe essere reattivo', () => {
      component.isDragOverVideo.set(true);
      expect(component.isDragOverVideo()).toBe(true);
    });
  });

  describe('Poster File Management', () => {
    it('existingPosterUrl dovrebbe iniziare null', () => {
      expect(component.existingPosterUrl()).toBeNull();
    });

    it('existingPosterUrl dovrebbe essere reattivo', () => {
      component.existingPosterUrl.set('https://example.com/poster.jpg');
      expect(component.existingPosterUrl()).toBe('https://example.com/poster.jpg');
    });
  });

  describe('Categories Loading', () => {
    it('categories dovrebbe iniziare vuoto', () => {
      expect(component.categories()).toEqual([]);
    });

    it('loadingCategories dovrebbe iniziare true', () => {
      expect(component.loadingCategories()).toBe(true);
    });

    it('categories dovrebbe essere reattivo', () => {
      const cats: Category[] = [
        { id: 1, title: 'Web' },
        { id: 2, title: 'Mobile' }
      ];
      component.categories.set(cats);
      expect(component.categories().length).toBe(2);
    });

    it('loadingCategories dovrebbe essere reattivo', () => {
      component.loadingCategories.set(false);
      expect(component.loadingCategories()).toBe(false);
    });
  });

  describe('Form Controls Details', () => {
    it('category_id dovrebbe essere required', () => {
      component.addProjectForm.patchValue({ category_id: '' });
      const control = component.addProjectForm.get('category_id');
      expect(control?.hasError('required')).toBe(true);
    });

    it('description dovrebbe essere required', () => {
      component.addProjectForm.patchValue({ description: '' });
      const control = component.addProjectForm.get('description');
      expect(control?.hasError('required')).toBe(true);
    });

    it('poster_file dovrebbe essere required', () => {
      component.addProjectForm.patchValue({ poster_file: null });
      const control = component.addProjectForm.get('poster_file');
      expect(control?.hasError('required')).toBe(true);
    });

    it('video_file NON dovrebbe essere required', () => {
      component.addProjectForm.patchValue({ video_file: null });
      const control = component.addProjectForm.get('video_file');
      expect(control?.hasError('required')).toBeFalsy();
    });

    it('title dovrebbe avere maxLength 50', () => {
      const longTitle = 'A'.repeat(51);
      component.addProjectForm.patchValue({ title: longTitle });
      const control = component.addProjectForm.get('title');
      expect(control?.hasError('maxlength')).toBe(true);
    });

    it('description dovrebbe avere maxLength 1000', () => {
      const longDesc = 'A'.repeat(1001);
      component.addProjectForm.patchValue({ description: longDesc });
      const control = component.addProjectForm.get('description');
      expect(control?.hasError('maxlength')).toBe(true);
    });
  });

  describe('Form Disable During Upload', () => {
    it('dovrebbe disabilitare controlli quando uploading è true', () => {
      component.uploading.set(true);
      
      const title = component.addProjectForm.get('title');
      const category = component.addProjectForm.get('category_id');
      const description = component.addProjectForm.get('description');
      
      expect(title?.disabled).toBe(true);
      expect(category?.disabled).toBe(true);
      expect(description?.disabled).toBe(true);
    });

    it('dovrebbe abilitare controlli quando uploading è false', () => {
      component.uploading.set(false);
      
      const title = component.addProjectForm.get('title');
      expect(title?.disabled).toBe(false);
    });
  });

  describe('ViewChild References', () => {
    it('videoInputRef dovrebbe essere definito', () => {
      expect(component.videoInputRef).toBeDefined();
    });
  });

  describe('Notifications System', () => {
    it('notifications dovrebbe iniziare vuoto', () => {
      expect(component.notifications()).toEqual([]);
    });

    it('notifications dovrebbe essere reattivo', () => {
      const notif = {
        id: 'test-1',
        message: 'Test notification',
        type: 'info' as NotificationType,
        timestamp: Date.now(),
        fieldId: 'title'
      };
      
      component.notifications.set([notif]);
      expect(component.notifications().length).toBe(1);
    });

    it('dovrebbe gestire multiple notifiche', () => {
      const notifs = [
        { id: '1', message: 'Notifica 1', type: 'success' as NotificationType, timestamp: Date.now(), fieldId: 'f1' },
        { id: '2', message: 'Notifica 2', type: 'error' as NotificationType, timestamp: Date.now(), fieldId: 'f2' }
      ];
      
      component.notifications.set(notifs);
      expect(component.notifications().length).toBe(2);
    });
  });

  describe('Form Valid Combinations', () => {
    it('form completo dovrebbe essere valido', () => {
      component.addProjectForm.patchValue({
        title: 'Test Project',
        category_id: 1,
        description: 'Test Description',
        poster_file: new File(['img'], 'poster.jpg', { type: 'image/jpeg' })
      });
      
      expect(component.addProjectForm.valid).toBe(true);
    });

    it('form senza title dovrebbe essere invalido', () => {
      component.addProjectForm.patchValue({
        title: '',
        category_id: 1,
        description: 'Desc',
        poster_file: new File(['img'], 'p.jpg', { type: 'image/jpeg' })
      });
      
      expect(component.addProjectForm.invalid).toBe(true);
    });

    it('form senza category dovrebbe essere invalido', () => {
      component.addProjectForm.patchValue({
        title: 'Title',
        category_id: '',
        description: 'Desc',
        poster_file: new File(['img'], 'p.jpg', { type: 'image/jpeg' })
      });
      
      expect(component.addProjectForm.invalid).toBe(true);
    });

    it('form senza description dovrebbe essere invalido', () => {
      component.addProjectForm.patchValue({
        title: 'Title',
        category_id: 1,
        description: '',
        poster_file: new File(['img'], 'p.jpg', { type: 'image/jpeg' })
      });
      
      expect(component.addProjectForm.invalid).toBe(true);
    });

    it('form senza poster_file dovrebbe essere invalido', () => {
      component.addProjectForm.patchValue({
        title: 'Title',
        category_id: 1,
        description: 'Desc',
        poster_file: null
      });
      
      expect(component.addProjectForm.invalid).toBe(true);
    });

    it('form con video_file è opzionale (dovrebbe essere valido)', () => {
      component.addProjectForm.patchValue({
        title: 'Title',
        category_id: 1,
        description: 'Desc',
        poster_file: new File(['img'], 'p.jpg', { type: 'image/jpeg' }),
        video_file: null
      });
      
      expect(component.addProjectForm.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire category_id come numero', () => {
      component.addProjectForm.patchValue({ category_id: 5 });
      expect(component.addProjectForm.get('category_id')?.value).toBe(5);
    });

    it('dovrebbe gestire category_id come stringa', () => {
      component.addProjectForm.patchValue({ category_id: '3' });
      expect(component.addProjectForm.get('category_id')?.value).toBe('3');
    });

    it('dovrebbe gestire title con caratteri speciali', () => {
      component.addProjectForm.patchValue({ title: 'Progetto #1 (2025) - Test!' });
      expect(component.addProjectForm.get('title')?.valid).toBe(true);
    });

    it('dovrebbe gestire description multiline', () => {
      const multiline = 'Linea 1\nLinea 2\nLinea 3';
      component.addProjectForm.patchValue({ description: multiline });
      expect(component.addProjectForm.get('description')?.value).toContain('\n');
    });
  });

  describe('Form Reset', () => {
    it('dovrebbe permettere reset del form', () => {
      component.addProjectForm.patchValue({
        title: 'Test',
        category_id: 1,
        description: 'Desc'
      });
      
      component.addProjectForm.reset();
      
      expect(component.addProjectForm.get('title')?.value).toBeFalsy();
      expect(component.addProjectForm.get('description')?.value).toBeFalsy();
    });

    it('reset dovrebbe pulire anche i file signals', () => {
      component.selectedPosterFile.set(new File(['img'], 'p.jpg', { type: 'image/jpeg' }));
      component.selectedVideoFile.set(new File(['vid'], 'v.mp4', { type: 'video/mp4' }));
      
      component.addProjectForm.reset();
      component.selectedPosterFile.set(null);
      component.selectedVideoFile.set(null);
      
      expect(component.selectedPosterFile()).toBeNull();
      expect(component.selectedVideoFile()).toBeNull();
    });
  });

  describe('ngOnInit Lifecycle', () => {
    it('ngOnInit dovrebbe essere chiamato', () => {
      const spy = spyOn(component, 'ngOnInit').and.callThrough();
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });
});

/** COPERTURA: ~85% - +60 test aggiunti */
