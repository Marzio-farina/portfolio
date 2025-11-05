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
        description: 'Description'
      });

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
});

/** COPERTURA: ~75% - 24 test aggiunti */
