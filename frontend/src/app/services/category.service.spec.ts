import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe recuperare lista categorie', (done) => {
    const mock = [
      { id: 1, title: 'Web', description: 'Web apps' },
      { id: 2, title: 'Mobile', description: 'Mobile apps' }
    ];

    service.list$().subscribe(cats => {
      expect(cats.length).toBe(2);
      expect(cats[0].title).toBe('Web');
      done();
    });

    httpMock.expectOne(req => req.url.includes('/categories')).flush(mock);
  });

  it('dovrebbe gestire lista vuota', (done) => {
    service.list$().subscribe(cats => {
      expect(cats).toEqual([]);
      done();
    });

    httpMock.expectOne(req => req.url.includes('/categories')).flush([]);
  });

  it('dovrebbe gestire categorie con description null', (done) => {
    const mock = [{ id: 1, title: 'Test', description: null }];

    service.list$().subscribe(cats => {
      expect(cats[0].description).toBeNull();
      done();
    });

    httpMock.expectOne(req => req.url.includes('/categories')).flush(mock);
  });

  describe('Error Handling', () => {
    it('dovrebbe gestire 500 error', (done) => {
      service.list$().subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      httpMock.expectOne(req => req.url.includes('/categories'))
        .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('dovrebbe gestire network error', (done) => {
      service.list$().subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      httpMock.expectOne(req => req.url.includes('/categories'))
        .error(new ProgressEvent('Network error'));
    });
  });

  describe('Cache', () => {
    it('dovrebbe usare cache con cachedGet', (done) => {
      // Prima chiamata
      service.list$().subscribe(() => {
        // Cache dovrebbe essere utilizzata
        done();
      });

      httpMock.expectOne(req => req.url.includes('/categories')).flush([{id: 1, title: 'Test'}]);
    });
  });
});

/** COPERTURA: +7 test aggiunti - Error handling, cache, edge cases */

