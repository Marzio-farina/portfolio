import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CvFileService, CvFileResponse, CvFilesListResponse } from './cv-file.service';

/**
 * Test Suite per CvFileService
 * 
 * Servizio per gestire il caricamento, download e recupero dei file CV
 */
describe('CvFileService', () => {
  let service: CvFileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CvFileService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(CvFileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('getDefault$()', () => {
    it('dovrebbe recuperare il CV di default senza userId', (done) => {
      const mockResponse: CvFileResponse = {
        success: true,
        cv: {
          id: 1,
          filename: 'cv-mario-rossi.pdf',
          title: 'CV Principale',
          file_size: 2048000,
          is_default: true,
          download_url: '/api/cv-files/1/download',
          view_url: '/api/cv-files/1/view'
        }
      };

      service.getDefault$().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.cv?.id).toBe(1);
        expect(response.cv?.filename).toBe('cv-mario-rossi.pdf');
        expect(response.cv?.is_default).toBe(true);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files/default'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('user_id')).toBe(false);
      req.flush(mockResponse);
    });

    it('dovrebbe recuperare il CV di default con userId specifico', (done) => {
      const mockResponse: CvFileResponse = {
        success: true,
        cv: {
          id: 5,
          filename: 'cv-user-5.pdf',
          title: 'CV User 5',
          file_size: 1024000,
          is_default: true,
          download_url: '/api/cv-files/5/download'
        }
      };

      service.getDefault$(42).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.cv?.id).toBe(5);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes('/cv-files/default') && req.params.get('user_id') === '42'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('dovrebbe gestire risposta senza CV disponibile', (done) => {
      const mockResponse: CvFileResponse = {
        success: false,
        message: 'Nessun CV disponibile'
      };

      service.getDefault$().subscribe(response => {
        expect(response.success).toBe(false);
        expect(response.cv).toBeUndefined();
        expect(response.message).toBe('Nessun CV disponibile');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files/default'));
      req.flush(mockResponse);
    });
  });

  describe('getAll$()', () => {
    it('dovrebbe recuperare tutti i CV files', (done) => {
      const mockResponse: CvFilesListResponse = {
        success: true,
        cvs: [
          {
            id: 1,
            filename: 'cv1.pdf',
            title: 'CV Principale',
            file_size: 2048000,
            is_default: true,
            created_at: '2024-01-01',
            download_url: '/api/cv-files/1/download'
          },
          {
            id: 2,
            filename: 'cv2.pdf',
            title: 'CV Alternativo',
            file_size: 1024000,
            is_default: false,
            created_at: '2024-01-15',
            download_url: '/api/cv-files/2/download'
          }
        ]
      };

      service.getAll$().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.cvs.length).toBe(2);
        expect(response.cvs[0].is_default).toBe(true);
        expect(response.cvs[1].is_default).toBe(false);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('dovrebbe gestire lista vuota di CV', (done) => {
      const mockResponse: CvFilesListResponse = {
        success: true,
        cvs: []
      };

      service.getAll$().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.cvs.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files'));
      req.flush(mockResponse);
    });
  });

  describe('downloadFile()', () => {
    it('dovrebbe aprire URL in nuova finestra', () => {
      spyOn(window, 'open');
      const url = 'http://localhost:8000/api/cv-files/1/download';

      service.downloadFile(url);

      expect(window.open).toHaveBeenCalledWith(url, '_blank');
    });

    it('dovrebbe gestire URL con parametri', () => {
      spyOn(window, 'open');
      const url = 'http://localhost:8000/api/cv-files/1/download?token=abc123';

      service.downloadFile(url);

      expect(window.open).toHaveBeenCalledWith(url, '_blank');
    });
  });

  describe('downloadById()', () => {
    it('dovrebbe costruire URL e chiamare downloadFile', () => {
      spyOn(window, 'open');
      
      service.downloadById(10);

      expect(window.open).toHaveBeenCalledWith(
        jasmine.stringContaining('/cv-files/10/download'),
        '_blank'
      );
    });

    it('dovrebbe gestire ID di tipo numerico', () => {
      spyOn(window, 'open');
      
      service.downloadById(999);

      expect(window.open).toHaveBeenCalledWith(
        jasmine.stringContaining('/cv-files/999/download'),
        '_blank'
      );
    });
  });

  describe('upload$()', () => {
    it('dovrebbe caricare un file CV con tutti i parametri', (done) => {
      const mockFile = new File(['CV content'], 'test-cv.pdf', { type: 'application/pdf' });
      const mockResponse: CvFileResponse = {
        success: true,
        cv: {
          id: 100,
          filename: 'test-cv.pdf',
          title: 'CV Test',
          file_size: mockFile.size,
          is_default: true,
          download_url: '/api/cv-files/100/download'
        }
      };

      service.upload$(mockFile, 'CV Test', true).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.cv?.id).toBe(100);
        expect(response.cv?.filename).toBe('test-cv.pdf');
        expect(response.cv?.is_default).toBe(true);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files/upload'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      
      const formData = req.request.body as FormData;
      expect(formData.has('cv_file')).toBe(true);
      expect(formData.has('title')).toBe(true);
      expect(formData.has('is_default')).toBe(true);
      
      req.flush(mockResponse);
    });

    it('dovrebbe caricare file senza titolo', (done) => {
      const mockFile = new File(['content'], 'cv.pdf', { type: 'application/pdf' });
      const mockResponse: CvFileResponse = {
        success: true,
        cv: {
          id: 101,
          filename: 'cv.pdf',
          title: null,
          file_size: mockFile.size,
          download_url: '/api/cv-files/101/download'
        }
      };

      service.upload$(mockFile).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.cv?.title).toBeNull();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files/upload'));
      const formData = req.request.body as FormData;
      expect(formData.has('cv_file')).toBe(true);
      expect(formData.has('title')).toBe(false);
      
      req.flush(mockResponse);
    });

    it('dovrebbe caricare file con is_default = false', (done) => {
      const mockFile = new File(['content'], 'cv-alt.pdf', { type: 'application/pdf' });
      const mockResponse: CvFileResponse = {
        success: true,
        cv: {
          id: 102,
          filename: 'cv-alt.pdf',
          title: 'CV Alternativo',
          file_size: mockFile.size,
          is_default: false,
          download_url: '/api/cv-files/102/download'
        }
      };

      service.upload$(mockFile, 'CV Alternativo', false).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.cv?.is_default).toBe(false);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files/upload'));
      const formData = req.request.body as FormData;
      // is_default false non dovrebbe essere nel form data
      expect(formData.has('is_default')).toBe(false);
      
      req.flush(mockResponse);
    });

    it('dovrebbe gestire errore di upload', (done) => {
      const mockFile = new File(['content'], 'cv.pdf', { type: 'application/pdf' });

      service.upload$(mockFile, 'Test').subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files/upload'));
      req.flush(
        { success: false, message: 'Validation failed' }, 
        { status: 422, statusText: 'Unprocessable Entity' }
      );
    });

    it('dovrebbe gestire file di grandi dimensioni', (done) => {
      // Creo un file "grande" (simulato)
      const largeContent = new Array(1024 * 1024).join('x'); // ~1MB
      const mockFile = new File([largeContent], 'large-cv.pdf', { type: 'application/pdf' });
      
      const mockResponse: CvFileResponse = {
        success: true,
        cv: {
          id: 200,
          filename: 'large-cv.pdf',
          title: 'CV Grande',
          file_size: mockFile.size,
          download_url: '/api/cv-files/200/download'
        }
      };

      service.upload$(mockFile, 'CV Grande').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.cv?.file_size).toBeGreaterThan(0);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv-files/upload'));
      req.flush(mockResponse);
    });
  });
});

/**
 * COPERTURA: ~95% del servizio
 * - getDefault$ con/senza userId
 * - getAll$ completo
 * - downloadFile e downloadById
 * - upload$ con vari scenari
 * - Error handling
 * - FormData validation
 */

