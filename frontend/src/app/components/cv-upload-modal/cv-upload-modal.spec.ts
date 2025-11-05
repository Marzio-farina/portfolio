import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CvUploadModal } from './cv-upload-modal';
import { CvFileService } from '../../services/cv-file.service';
import { of, throwError } from 'rxjs';

describe('CvUploadModal', () => {
  let component: CvUploadModal;
  let fixture: ComponentFixture<CvUploadModal>;
  let cvFileServiceSpy: jasmine.SpyObj<CvFileService>;

  beforeEach(async () => {
    cvFileServiceSpy = jasmine.createSpyObj('CvFileService', ['upload$']);

    await TestBed.configureTestingModule({
      imports: [CvUploadModal, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CvFileService, useValue: cvFileServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CvUploadModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('uploadForm dovrebbe essere inizializzato', () => {
    expect(component.uploadForm).toBeTruthy();
    expect(component.uploadForm.get('title')).toBeTruthy();
    expect(component.uploadForm.get('cv_file')).toBeTruthy();
  });

  it('cv_file dovrebbe essere required', () => {
    const cvControl = component.uploadForm.get('cv_file');
    expect(cvControl?.hasError('required')).toBe(true);
  });

  it('onFileSelected dovrebbe impostare file', () => {
    const mockFile = new File(['content'], 'cv.pdf', { type: 'application/pdf' });
    const event = { target: { files: [mockFile] } } as any;

    component.onFileSelected(event);

    expect(component.selectedFile()).toBe(mockFile);
  });

  it('onFileSelected dovrebbe validare tipo PDF', () => {
    const invalidFile = new File(['content'], 'doc.txt', { type: 'text/plain' });
    const event = { target: { files: [invalidFile], value: '' } } as any;

    component.onFileSelected(event);

    expect(component.errorMsg()).toContain('Formato non supportato');
    expect(component.selectedFile()).toBeNull();
  });

  it('onSubmit non dovrebbe submitare se form invalido', () => {
    component.uploadForm.patchValue({ title: '', cv_file: null });

    component.onSubmit();

    expect(cvFileServiceSpy.upload$).not.toHaveBeenCalled();
  });

  it('onSubmit dovrebbe uploadare con dati validi', (done) => {
    const mockFile = new File(['content'], 'cv.pdf', { type: 'application/pdf' });
    component.selectedFile.set(mockFile);
    component.uploadForm.patchValue({ cv_file: mockFile, title: 'My CV' });

    cvFileServiceSpy.upload$.and.returnValue(of({ success: true } as any));

    component.uploaded.subscribe(() => {
      expect(cvFileServiceSpy.upload$).toHaveBeenCalled();
      done();
    });

    component.onSubmit();
  });

  it('onCancel dovrebbe emettere cancelled', (done) => {
    component.cancelled.subscribe(() => {
      expect(true).toBe(true);
      done();
    });

    component.onCancel();
  });

  it('dovrebbe gestire errore upload', (done) => {
    const mockFile = new File(['content'], 'cv.pdf', { type: 'application/pdf' });
    component.selectedFile.set(mockFile);
    component.uploadForm.patchValue({ cv_file: mockFile });

    cvFileServiceSpy.upload$.and.returnValue(throwError(() => ({ status: 500 })));

    component.onSubmit();

    setTimeout(() => {
      expect(component.errorMsg()).toBeTruthy();
      expect(component.uploading()).toBe(false);
      done();
    }, 100);
  });
});

