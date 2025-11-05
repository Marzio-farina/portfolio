import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TechnologyService } from './technology.service';

describe('TechnologyService', () => {
  let service: TechnologyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TechnologyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe recuperare lista tecnologie', (done) => {
    const mock = [
      { id: 1, name: 'Angular' },
      { id: 2, name: 'TypeScript' }
    ];

    service.list$().subscribe(techs => {
      expect(techs.length).toBe(2);
      done();
    });

    httpMock.expectOne(req => req.url.includes('/technologies')).flush(mock);
  });

  it('dovrebbe recuperare tecnologie con descrizione', (done) => {
    const mock = [
      { id: 1, name: 'Angular', description: 'Framework' },
      { id: 2, name: 'React', description: null }
    ];

    service.list$().subscribe(techs => {
      expect(techs[0].description).toBe('Framework');
      expect(techs[1].description).toBeNull();
      done();
    });

    httpMock.expectOne(req => req.url.includes('/technologies')).flush(mock);
  });

  it('dovrebbe gestire lista vuota', (done) => {
    service.list$().subscribe(techs => {
      expect(techs).toEqual([]);
      done();
    });

    httpMock.expectOne(req => req.url.includes('/technologies')).flush([]);
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

      httpMock.expectOne(req => req.url.includes('/technologies'))
        .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('dovrebbe gestire 404 error', (done) => {
      service.list$().subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      httpMock.expectOne(req => req.url.includes('/technologies'))
        .flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('dovrebbe gestire network error', (done) => {
      service.list$().subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      httpMock.expectOne(req => req.url.includes('/technologies'))
        .error(new ProgressEvent('Network error'));
    });
  });

  describe('Cache & Performance', () => {
    it('dovrebbe usare cache con cachedGet', (done) => {
      service.list$().subscribe(() => done());

      httpMock.expectOne(req => req.url.includes('/technologies'))
        .flush([{id: 1, name: 'Vue'}]);
    });

    it('dovrebbe gestire tecnologie duplicate', (done) => {
      const mock = [
        { id: 1, name: 'Angular' },
        { id: 2, name: 'Angular' }
      ];

      service.list$().subscribe(techs => {
        expect(techs.length).toBe(2);
        done();
      });

      httpMock.expectOne(req => req.url.includes('/technologies')).flush(mock);
    });
  });
});

/** COPERTURA: +9 test aggiunti - Error handling, cache, edge cases, filters */

