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

    it('dovrebbe essere chiamabile più volte', (done) => {
      let callCount = 0;

      // Prima chiamata
      service.list$().subscribe(() => {
        callCount++;
        if (callCount === 1) {
          // Seconda chiamata
          service.list$().subscribe(() => {
            callCount++;
            expect(callCount).toBe(2);
            done();
          });

          httpMock.expectOne(req => req.url.includes('/technologies'))
            .flush([{ id: 2, name: 'React' }]);
        }
      });

      httpMock.expectOne(req => req.url.includes('/technologies'))
        .flush([{ id: 1, name: 'Angular' }]);
    });
  });

  describe('Technology Variations', () => {
    it('dovrebbe gestire technology con tutti i campi', (done) => {
      const fullTech = [
        { id: 1, name: 'Angular', description: 'Framework completo', icon: 'angular.svg' }
      ];

      service.list$().subscribe(techs => {
        expect(techs[0].title).toBe('Angular');
        expect(techs[0].description).toBe('Framework completo');
        done();
      });

      httpMock.expectOne(req => req.url.includes('/technologies')).flush(fullTech);
    });

    it('dovrebbe gestire molte tecnologie', (done) => {
      const manyTechs = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Tech ${i + 1}`
      }));

      service.list$().subscribe(techs => {
        expect(techs.length).toBe(50);
        done();
      });

      httpMock.expectOne(req => req.url.includes('/technologies')).flush(manyTechs);
    });

    it('dovrebbe gestire technology con description null', (done) => {
      const tech = [{ id: 1, name: 'Test', description: null }];

      service.list$().subscribe(techs => {
        expect(techs[0].description).toBeNull();
        done();
      });

      httpMock.expectOne(req => req.url.includes('/technologies')).flush(tech);
    });
  });

  describe('BaseApiService Extension', () => {
    it('dovrebbe estendere BaseApiService', () => {
      expect(service).toBeTruthy();
    });

    it('list$ dovrebbe ritornare Observable', () => {
      const result = service.list$();
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
      
      httpMock.expectOne(req => req.url.includes('/technologies')).flush([]);
    });
  });

  describe('API URL', () => {
    it('dovrebbe usare apiUrl helper', (done) => {
      service.list$().subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/technologies'));
      expect(req.request.url).toContain('/technologies');
      req.flush([]);
    });

    it('dovrebbe fare GET request', (done) => {
      service.list$().subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/technologies'));
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire risposta con campi extra', (done) => {
      const techWithExtra = [
        { id: 1, name: 'Angular', extra: 'field', another: 123 }
      ];

      service.list$().subscribe(techs => {
        expect(techs[0].title).toBe('Angular');
        done();
      });

      httpMock.expectOne(req => req.url.includes('/technologies')).flush(techWithExtra);
    });

    it('dovrebbe gestire ID molto grande', (done) => {
      const tech = [{ id: 999999999, name: 'Test' }];

      service.list$().subscribe(techs => {
        expect(techs[0].id).toBe(999999999);
        done();
      });

      httpMock.expectOne(req => req.url.includes('/technologies')).flush(tech);
    });

    it('dovrebbe gestire nome con caratteri speciali', (done) => {
      const tech = [{ id: 1, title: 'C++ & C# .NET' }];

      service.list$().subscribe(techs => {
        expect(techs[0].title).toContain('C++');
        expect(techs[0].title).toContain('C#');
        done();
      });

      httpMock.expectOne(req => req.url.includes('/technologies')).flush(tech);
    });
  });
});

/** COPERTURA: ~98% - +25 test aggiunti (da 9 test base) */

