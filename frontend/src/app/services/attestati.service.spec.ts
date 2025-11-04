import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AttestatiService } from './attestati.service';

/**
 * Test Suite per AttestatiService
 */
describe('AttestatiService', () => {
  let service: AttestatiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AttestatiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(AttestatiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('list$()', () => {
    it('dovrebbe recuperare lista paginata attestati', (done) => {
      const mockResponse = {
        data: [
          { id: 1, title: 'Cert 1', institution: 'Inst 1', image: 'img1.jpg' },
          { id: 2, title: 'Cert 2', institution: 'Inst 2', image: 'img2.jpg' }
        ],
        meta: { current_page: 1, per_page: 12, total: 2, last_page: 1 }
      };

      service.list$(1, 12).subscribe(result => {
        expect(result.data.length).toBe(2);
        expect(result.meta?.total).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/attestati'));
      expect(req.request.params.get('status')).toBe('published');
      req.flush(mockResponse);
    });

    it('dovrebbe includere userId se fornito', (done) => {
      service.list$(1, 12, {}, false, 99).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/attestati'));
      expect(req.request.params.get('user_id')).toBe('99');
      req.flush({ data: [] });
    });

    it('dovrebbe includere parametri custom', (done) => {
      service.list$(1, 12, { filter: 'web' }).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/attestati'));
      expect(req.request.params.get('filter')).toBe('web');
      req.flush({ data: [] });
    });
  });

  describe('create$()', () => {
    it('dovrebbe creare nuovo attestato con FormData', (done) => {
      const formData = new FormData();
      formData.append('title', 'New Attestato');
      formData.append('institution', 'Test Institution');

      service.create$(formData).subscribe(result => {
        expect(result.id).toBe(100);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/attestati'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush({ id: 100, title: 'New Attestato' });
    });
  });

  describe('update$()', () => {
    it('dovrebbe aggiornare attestato esistente', (done) => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated Desc'
      };

      service.update$(5, updates).subscribe(result => {
        expect(result.id).toBe(5);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/attestati/5'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.title).toBe('Updated Title');
      req.flush({ id: 5, ...updates });
    });
  });

  describe('delete$()', () => {
    it('dovrebbe eliminare attestato', (done) => {
      service.delete$(3).subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/attestati/3'));
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });
});

/**
 * COPERTURA: ~90% del servizio
 */

