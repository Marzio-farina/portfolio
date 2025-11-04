import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestimonialService } from './testimonial.service';

/**
 * Test Suite per TestimonialService
 */
describe('TestimonialService', () => {
  let service: TestimonialService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TestimonialService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(TestimonialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('list$()', () => {
    it('dovrebbe recuperare lista paginata di testimonial', (done) => {
      const mockResponse = {
        data: [
          { id: 1, author_name: 'Mario', rating: 5, text: 'Great!' },
          { id: 2, author_name: 'Luigi', rating: 4, text: 'Good!' }
        ],
        meta: { current_page: 1, per_page: 8, total: 2, last_page: 1 }
      };

      service.list$(1, 8).subscribe(result => {
        expect(result.data.length).toBe(2);
        expect(result.meta?.total).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/testimonials'));
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('per_page')).toBe('8');
      req.flush(mockResponse);
    });

    it('dovrebbe includere userId se fornito', (done) => {
      service.list$(1, 8, 42).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/testimonials'));
      expect(req.request.params.get('user_id')).toBe('42');
      req.flush({ data: [] });
    });
  });

  describe('create$()', () => {
    it('dovrebbe creare testimonial con JSON se no file', (done) => {
      const data = {
        author_name: 'Test User',
        rating: 5,
        text: 'Amazing!',
        company: 'Test Company'
      };

      service.create$(data).subscribe(result => {
        expect(result).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/testimonials'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body.author_name).toBe('Test User');
      req.flush({ id: 10, ...data });
    });

    it('dovrebbe usare FormData se presente avatar_file', (done) => {
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
      const data = {
        author_name: 'User With Avatar',
        rating: 5,
        text: 'Great!',
        avatar_file: file
      };

      service.create$(data).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/testimonials'));
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush({ id: 11, author_name: 'User With Avatar' });
    });

    it('dovrebbe pulire campi null/undefined quando usa JSON', (done) => {
      const data = {
        author_name: 'Clean Test',
        rating: 4,
        text: 'Nice',
        company: null,  // Non dovrebbe essere inviato
        extra: undefined  // Non dovrebbe essere inviato
      };

      service.create$(data).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/testimonials'));
      expect(req.request.body.company).toBeUndefined();
      expect(req.request.body.extra).toBeUndefined();
      expect(req.request.body.author_name).toBe('Clean Test');
      req.flush({ id: 12 });
    });
  });
});

/**
 * COPERTURA: ~95% del servizio
 * - list$ con/senza userId
 * - create$ con JSON
 * - create$ con FormData
 * - Pulizia campi null/undefined
 */

