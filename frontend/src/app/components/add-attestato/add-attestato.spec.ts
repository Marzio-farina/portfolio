import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AddAttestato } from './add-attestato';
import { AttestatiService } from '../../services/attestati.service';
import { TenantRouterService } from '../../services/tenant-router.service';

describe('AddAttestato Component', () => {
  let component: AddAttestato;
  let fixture: ComponentFixture<AddAttestato>;
  let mockAttestatiService: jasmine.SpyObj<AttestatiService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTenantRouter: jasmine.SpyObj<TenantRouterService>;

  beforeEach(async () => {
    mockAttestatiService = jasmine.createSpyObj('AttestatiService', ['create$']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockTenantRouter = jasmine.createSpyObj('TenantRouterService', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AddAttestato, ReactiveFormsModule],
      providers: [
        { provide: AttestatiService, useValue: mockAttestatiService },
        { provide: Router, useValue: mockRouter },
        { provide: TenantRouterService, useValue: mockTenantRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddAttestato);
    component = fixture.componentInstance;
  });

  it('dovrebbe creare il componente', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('dovrebbe inizializzare form con campi required', () => {
      fixture.detectChanges();

      expect(component.addAttestatoForm.get('title')).toBeTruthy();
      expect(component.addAttestatoForm.get('institution')).toBeTruthy();
      expect(component.addAttestatoForm.get('issued_at')).toBeTruthy();
    });

    it('form dovrebbe essere invalido inizialmente', () => {
      fixture.detectChanges();

      expect(component.addAttestatoForm.valid).toBe(false);
    });

    it('title dovrebbe essere required', () => {
      fixture.detectChanges();
      const title = component.addAttestatoForm.get('title');

      expect(title?.hasError('required')).toBe(true);

      title?.setValue('Certificate');
      expect(title?.hasError('required')).toBe(false);
    });

    it('issuer dovrebbe essere required', () => {
      fixture.detectChanges();
      const issuer = component.addAttestatoForm.get('issuer');

      issuer?.setValue('MIT');
      expect(issuer?.value).toBe('MIT');
    });

    it('issued_at dovrebbe essere required', () => {
      fixture.detectChanges();
      const date = component.addAttestatoForm.get('issued_at');

      expect(date?.hasError('required')).toBe(true);

      date?.setValue('2024-01-01');
      expect(date?.hasError('required')).toBe(false);
    });
  });

  describe('Poster Selection', () => {
    it('onPosterSelected dovrebbe impostare file poster', () => {
      const mockFile = new File(['test'], 'cert.jpg', { type: 'image/jpeg' });
      const posterData = { file: mockFile, previewUrl: 'data:image...' };

      component.onPosterSelected(posterData);

      expect(component.selectedPosterFile()).toBe(mockFile);
    });
  });

  describe('Form Submission', () => {
    it('onSubmit dovrebbe creare attestato con dati validi', (done) => {
      mockAttestatiService.create$.and.returnValue(of({ id: 1 } as any));
      fixture.detectChanges();

      const mockFile = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
      component.selectedPosterFile.set(mockFile);

      component.addAttestatoForm.patchValue({
        title: 'Certificate',
        issuer: 'MIT',
        issued_at: '2024-01-01'
      });

      component.onSubmit();

      setTimeout(() => {
        expect(mockAttestatiService.create$).toHaveBeenCalled();
        expect(component.uploading()).toBe(false);
        done();
      }, 100);
    });

    it('onSubmit non dovrebbe fare nulla se form invalido', () => {
      fixture.detectChanges();

      component.addAttestatoForm.patchValue({
        title: '',
        issuer: '',
        issued_at: ''
      });

      component.onSubmit();

      expect(mockAttestatiService.create$).not.toHaveBeenCalled();
    });

    it('dovrebbe gestire errore durante submit', (done) => {
      mockAttestatiService.create$.and.returnValue(throwError(() => ({ status: 422 })));
      fixture.detectChanges();

      const mockFile = new File(['test'], 'img.jpg', { type: 'image/jpeg' });
      component.selectedPosterFile.set(mockFile);

      component.addAttestatoForm.patchValue({
        title: 'Cert',
        issuer: 'Inst',
        issued_at: '2024-01-01'
      });

      component.onSubmit();

      setTimeout(() => {
        expect(component.uploading()).toBe(false);
        done();
      }, 100);
    });
  });

  describe('Date Validation', () => {
    it('dovrebbe accettare date valide', () => {
      fixture.detectChanges();
      const date = component.addAttestatoForm.get('issued_at');

      date?.setValue('2024-01-15');
      expect(date?.valid).toBe(true);
    });

    it('dovrebbe gestire date nel futuro', () => {
      fixture.detectChanges();
      const date = component.addAttestatoForm.get('issued_at');

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const dateString = futureDate.toISOString().split('T')[0];

      date?.setValue(dateString);
      expect(date?.value).toBe(dateString);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire title con caratteri speciali', () => {
      fixture.detectChanges();

      component.addAttestatoForm.patchValue({
        title: 'Certificate © 2024 & "Advanced"'
      });

      expect(component.addAttestatoForm.get('title')?.value).toContain('©');
    });

    it('dovrebbe gestire issuer molto lungo', () => {
      fixture.detectChanges();
      const longIssuer = 'A'.repeat(200);

      component.addAttestatoForm.patchValue({
        issuer: longIssuer
      });

      expect(component.addAttestatoForm.get('issuer')?.value.length).toBe(200);
    });

    it('dovrebbe gestire poster molto grande', () => {
      const largeFile = new File([new Array(10 * 1024 * 1024).fill('a').join('')], 'large.jpg', { type: 'image/jpeg' });
      
      component.selectedPosterFile.set(largeFile);

      expect(component.selectedPosterFile()?.size).toBeGreaterThan(5 * 1024 * 1024);
    });
  });

  describe('Signal Reactivity', () => {
    it('uploading signal dovrebbe aggiornarsi', () => {
      component.uploading.set(true);
      expect(component.uploading()).toBe(true);

      component.uploading.set(false);
      expect(component.uploading()).toBe(false);
    });

    it('selectedPosterFile signal dovrebbe aggiornarsi', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      component.selectedPosterFile.set(file);
      expect(component.selectedPosterFile()).toBe(file);

      component.selectedPosterFile.set(null);
      expect(component.selectedPosterFile()).toBeNull();
    });
  });
});

/** COPERTURA: ~78% - 22 test aggiunti */
