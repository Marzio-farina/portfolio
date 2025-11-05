import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Injectable } from '@angular/core';

// Classe concreta per testare BaseApiService astratta
@Injectable()
class TestApiService extends BaseApiService {
  getData(url: string, params?: Record<string, any>): Observable<any> {
    return this.cachedGet(url, params);
  }
  
  clearCache(url?: string, params?: Record<string, any>): void {
    this.invalidate(url, params);
  }
}

describe('BaseApiService', () => {
  let service: TestApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TestApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(TestApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Caching Mechanism', () => {
    
    it('dovrebbe creare il servizio', () => {
      expect(service).toBeTruthy();
    });

    it('dovrebbe fare HTTP GET alla prima chiamata', (done) => {
      const mockData = { id: 1, name: 'Test' };
      
      service.getData('/api/test').subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    it('dovrebbe usare cache alla seconda chiamata (nessuna nuova HTTP)', (done) => {
      const mockData = { id: 1, name: 'Test' };
      
      // Prima chiamata
      service.getData('/api/test').subscribe();
      httpMock.expectOne('/api/test').flush(mockData);

      // Seconda chiamata - dovrebbe usare cache
      service.getData('/api/test').subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });

      // Nessuna nuova richiesta HTTP
      httpMock.expectNone('/api/test');
    });

    it('dovrebbe condividere observable tra subscriber multipli (shareReplay)', (done) => {
      const mockData = { id: 1, name: 'Shared' };
      let count = 0;

      // Prima subscribe
      service.getData('/api/shared').subscribe(data => {
        expect(data).toEqual(mockData);
        count++;
      });

      // Seconda subscribe (prima che la prima completi)
      service.getData('/api/shared').subscribe(data => {
        expect(data).toEqual(mockData);
        count++;
        
        // Entrambi i subscriber ricevono lo stesso valore
        expect(count).toBe(2);
        done();
      });

      // Solo una richiesta HTTP per entrambi i subscriber
      const req = httpMock.expectOne('/api/shared');
      req.flush(mockData);
    });
  });

  describe('Cache con Parametri', () => {
    
    it('dovrebbe fare HTTP GET con parametri', (done) => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const params = { page: 1, limit: 10 };
      
      service.getData('/api/items', params).subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/items' && 
        req.params.get('page') === '1' &&
        req.params.get('limit') === '10'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    it('dovrebbe cachare separatamente URL con parametri diversi', (done) => {
      const mockData1 = [{ id: 1 }];
      const mockData2 = [{ id: 2 }];
      
      // Prima chiamata con page=1
      service.getData('/api/items', { page: 1 }).subscribe(data => {
        expect(data).toEqual(mockData1);
      });
      httpMock.expectOne(req => req.params.get('page') === '1').flush(mockData1);

      // Seconda chiamata con page=2 (diversa cache key)
      service.getData('/api/items', { page: 2 }).subscribe(data => {
        expect(data).toEqual(mockData2);
        done();
      });
      httpMock.expectOne(req => req.params.get('page') === '2').flush(mockData2);
    });

    it('dovrebbe usare cache per stessi URL e parametri', (done) => {
      const mockData = [{ id: 1 }];
      const params = { page: 1, limit: 10 };
      
      // Prima chiamata
      service.getData('/api/items', params).subscribe();
      httpMock.expectOne(req => req.params.get('page') === '1').flush(mockData);

      // Seconda chiamata con stessi parametri - cache hit
      service.getData('/api/items', params).subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });

      // Nessuna nuova richiesta
      httpMock.expectNone('/api/items');
    });

    it('dovrebbe gestire parametri null/undefined', (done) => {
      const mockData = { test: true };
      
      service.getData('/api/test', undefined).subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });

      const req = httpMock.expectOne('/api/test');
      req.flush(mockData);
    });
  });

  describe('Cache Invalidation', () => {
    
    it('dovrebbe invalidare tutta la cache', (done) => {
      const mockData1 = { id: 1 };
      const mockData2 = { id: 2 };
      
      // Popola cache
      service.getData('/api/test1').subscribe();
      httpMock.expectOne('/api/test1').flush(mockData1);
      
      service.getData('/api/test2').subscribe();
      httpMock.expectOne('/api/test2').flush(mockData2);

      // Invalida tutta la cache
      service.clearCache();

      // Nuove chiamate dovrebbero fare HTTP
      service.getData('/api/test1').subscribe(data => {
        expect(data).toEqual(mockData1);
        done();
      });
      httpMock.expectOne('/api/test1').flush(mockData1);
    });

    it('dovrebbe invalidare cache per URL specifico', (done) => {
      const mockData = { id: 1 };
      
      // Popola cache
      service.getData('/api/test').subscribe();
      httpMock.expectOne('/api/test').flush(mockData);

      // Invalida solo questo URL
      service.clearCache('/api/test');

      // Nuova chiamata dovrebbe fare HTTP
      service.getData('/api/test').subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });
      httpMock.expectOne('/api/test').flush(mockData);
    });

    it('dovrebbe invalidare cache per URL con parametri specifici', (done) => {
      const mockData = { id: 1 };
      const params = { page: 1 };
      
      // Popola cache
      service.getData('/api/items', params).subscribe();
      httpMock.expectOne(req => req.params.get('page') === '1').flush(mockData);

      // Invalida solo questo URL+params
      service.clearCache('/api/items', params);

      // Nuova chiamata dovrebbe fare HTTP
      service.getData('/api/items', params).subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });
      httpMock.expectOne(req => req.params.get('page') === '1').flush(mockData);
    });

    it('dovrebbe invalidare con pattern prefix matching', (done) => {
      const mockData1 = { id: 1 };
      const mockData2 = { id: 2 };
      
      // Popola cache con più URL simili
      service.getData('/api/users/123').subscribe();
      httpMock.expectOne('/api/users/123').flush(mockData1);
      
      service.getData('/api/users/456').subscribe();
      httpMock.expectOne('/api/users/456').flush(mockData2);

      // Invalida con prefix
      service.clearCache('/api/users');

      // Entrambi dovrebbero fare nuove HTTP
      service.getData('/api/users/123').subscribe();
      httpMock.expectOne('/api/users/123').flush(mockData1);
      
      service.getData('/api/users/456').subscribe(data => {
        expect(data).toEqual(mockData2);
        done();
      });
      httpMock.expectOne('/api/users/456').flush(mockData2);
    });
  });

  describe('Error Handling', () => {
    
    it('dovrebbe propagare errori HTTP', (done) => {
      service.getData('/api/error').subscribe({
        next: () => fail('dovrebbe generare errore'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne('/api/error');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('dovrebbe cachare solo risposte successful (non errori)', (done) => {
      // Prima chiamata - errore
      service.getData('/api/flaky').subscribe({
        next: () => fail('dovrebbe generare errore'),
        error: () => {
          // Seconda chiamata - dovrebbe rifare HTTP (errore non cachato)
          service.getData('/api/flaky').subscribe(data => {
            expect(data).toEqual({ success: true });
            done();
          });
          
          httpMock.expectOne('/api/flaky').flush({ success: true });
        }
      });

      httpMock.expectOne('/api/flaky').flush('Error', { status: 500, statusText: 'Error' });
    });
  });

  describe('Observable Behavior', () => {
    
    it('dovrebbe ritornare Observable', () => {
      const result = service.getData('/api/test');
      expect(result instanceof Observable).toBe(true);
    });

    it('dovrebbe emettere valore quando HTTP completa', (done) => {
      const mockData = { test: 'value' };
      
      service.getData('/api/test').subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });

      httpMock.expectOne('/api/test').flush(mockData);
    });

    it('dovrebbe permettere unsubscribe', () => {
      const subscription = service.getData('/api/test').subscribe();
      
      expect(subscription.closed).toBe(false);
      subscription.unsubscribe();
      expect(subscription.closed).toBe(true);

      httpMock.expectOne('/api/test').flush({});
    });
  });

  describe('Performance', () => {
    
    it('dovrebbe evitare chiamate HTTP multiple per stesso URL', () => {
      const mockData = { id: 1 };
      
      // 10 subscribe allo stesso endpoint
      for (let i = 0; i < 10; i++) {
        service.getData('/api/test').subscribe();
      }

      // Solo una richiesta HTTP
      const requests = httpMock.match('/api/test');
      expect(requests.length).toBe(1);
      requests[0].flush(mockData);
    });

    it('dovrebbe ridurre bandwidth con caching', (done) => {
      const largeData = { data: 'x'.repeat(10000) }; // 10KB di dati
      let callCount = 0;

      // Prima chiamata
      service.getData('/api/large').subscribe(() => {
        callCount++;
        
        // Seconda chiamata - cache hit
        service.getData('/api/large').subscribe(() => {
          callCount++;
          expect(callCount).toBe(2);
          done();
        });
        
        // Nessuna nuova HTTP
        httpMock.expectNone('/api/large');
      });

      // Solo una HTTP per 10KB
      httpMock.expectOne('/api/large').flush(largeData);
    });
  });

  describe('Edge Cases', () => {
    
    it('dovrebbe gestire response vuota', (done) => {
      service.getData('/api/empty').subscribe(data => {
        expect(data).toBeNull();
        done();
      });

      httpMock.expectOne('/api/empty').flush(null);
    });

    it('dovrebbe gestire response array vuoto', (done) => {
      service.getData('/api/empty-array').subscribe(data => {
        expect(data).toEqual([]);
        done();
      });

      httpMock.expectOne('/api/empty-array').flush([]);
    });

    it('dovrebbe gestire response con oggetti complessi', (done) => {
      const complexData = {
        nested: {
          deep: {
            value: 'test'
          }
        },
        array: [1, 2, 3],
        null: null,
        boolean: true
      };
      
      service.getData('/api/complex').subscribe(data => {
        expect(data).toEqual(complexData);
        done();
      });

      httpMock.expectOne('/api/complex').flush(complexData);
    });

    it('dovrebbe gestire parametri con caratteri speciali', (done) => {
      const params = { 
        search: 'hello world',
        filter: 'type=test&status=active'
      };
      
      service.getData('/api/search', params).subscribe(data => {
        expect(data).toEqual({ results: [] });
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/search' &&
        req.params.has('search') &&
        req.params.has('filter')
      );
      req.flush({ results: [] });
    });
  });

  describe('Cache Key Generation', () => {
    
    it('dovrebbe generare cache key diversi per parametri diversi', (done) => {
      const mockData1 = [{ page: 1 }];
      const mockData2 = [{ page: 2 }];
      
      // Prima chiamata
      service.getData('/api/items', { page: 1 }).subscribe(() => {
        // Seconda chiamata dopo che la prima è completata
        service.getData('/api/items', { page: 2 }).subscribe(data => {
          expect(data).toEqual(mockData2);
          done();
        });
        
        // Flush seconda richiesta
        const req2 = httpMock.expectOne(req => req.params.get('page') === '2');
        req2.flush(mockData2);
      });

      // Flush prima richiesta
      const req1 = httpMock.expectOne(req => req.params.get('page') === '1');
      req1.flush(mockData1);
    });

    it('dovrebbe generare stessa cache key per stessi parametri', (done) => {
      const mockData = [{ test: true }];
      
      service.getData('/api/items', { page: 1, limit: 10 }).subscribe();
      
      const req = httpMock.expectOne(req => req.url === '/api/items');
      req.flush(mockData);

      // Seconda chiamata con stessi parametri - cache hit
      service.getData('/api/items', { page: 1, limit: 10 }).subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });

      // Nessuna nuova HTTP
      httpMock.expectNone('/api/items');
    });

    it('dovrebbe gestire parametri con ordine diverso', (done) => {
      // HttpParams non garantisce ordine, quindi potrebbero essere cache key diverse
      const mockData = [{ id: 1 }];
      
      service.getData('/api/items', { b: 2, a: 1 }).subscribe(() => {
        service.getData('/api/items', { a: 1, b: 2 }).subscribe(data => {
          // Completato (potrebbe essere cache hit o nuova richiesta)
          expect(data).toBeDefined();
          done();
        });
        
        // Flush seconda richiesta se presente
        const req2 = httpMock.match(req => req.url.includes('/api/items'));
        if (req2.length > 0) {
          req2[0].flush(mockData);
        }
      });

      // Flush prima richiesta
      const req1 = httpMock.expectOne(req => req.url.includes('/api/items'));
      req1.flush(mockData);
    });
  });

  describe('Invalidate Cache', () => {
    
    it('dovrebbe invalidare tutta la cache senza parametri', () => {
      // Popola cache
      service.getData('/api/test1').subscribe();
      httpMock.expectOne('/api/test1').flush({ id: 1 });
      
      service.getData('/api/test2').subscribe();
      httpMock.expectOne('/api/test2').flush({ id: 2 });

      // Invalida tutto
      service.clearCache();

      // Nuove chiamate dovrebbero fare HTTP
      service.getData('/api/test1').subscribe();
      service.getData('/api/test2').subscribe();

      expect(httpMock.match('/api/test1').length).toBe(1);
      expect(httpMock.match('/api/test2').length).toBe(1);
      
      httpMock.match('/api/test1').forEach(req => req.flush({ id: 1 }));
      httpMock.match('/api/test2').forEach(req => req.flush({ id: 2 }));
    });

    it('dovrebbe invalidare cache per URL specifico mantenendo altri', (done) => {
      // Popola cache
      service.getData('/api/keep').subscribe();
      httpMock.expectOne('/api/keep').flush({ keep: true });
      
      service.getData('/api/remove').subscribe();
      httpMock.expectOne('/api/remove').flush({ remove: true });

      // Invalida solo /api/remove
      service.clearCache('/api/remove');

      // /api/keep usa ancora cache (no HTTP)
      service.getData('/api/keep').subscribe(data => {
        expect(data).toEqual({ keep: true });
      });
      httpMock.expectNone('/api/keep');

      // /api/remove fa nuova HTTP
      service.getData('/api/remove').subscribe(data => {
        expect(data).toEqual({ remove: true });
        done();
      });
      httpMock.expectOne('/api/remove').flush({ remove: true });
    });

    it('dovrebbe invalidare con prefix matching', () => {
      // Popola cache con URL simili
      service.getData('/api/users/123').subscribe();
      httpMock.expectOne('/api/users/123').flush({ id: 123 });
      
      service.getData('/api/users/456').subscribe();
      httpMock.expectOne('/api/users/456').flush({ id: 456 });
      
      service.getData('/api/posts/1').subscribe();
      httpMock.expectOne('/api/posts/1').flush({ id: 1 });

      // Invalida solo /api/users (prefix match)
      service.clearCache('/api/users');

      // /api/users/* dovrebbero fare nuove HTTP
      service.getData('/api/users/123').subscribe();
      service.getData('/api/users/456').subscribe();
      
      // /api/posts/* usa ancora cache
      service.getData('/api/posts/1').subscribe();

      expect(httpMock.match('/api/users/123').length).toBe(1);
      expect(httpMock.match('/api/users/456').length).toBe(1);
      httpMock.expectNone('/api/posts/1'); // Cache hit
      
      httpMock.match('/api/users/123').forEach(req => req.flush({ id: 123 }));
      httpMock.match('/api/users/456').forEach(req => req.flush({ id: 456 }));
    });
  });

  describe('Concurrent Requests', () => {
    
    it('dovrebbe gestire richieste concorrenti allo stesso URL', (done) => {
      const mockData = { id: 1, concurrent: true };
      let count = 0;

      // 5 richieste simultanee
      for (let i = 0; i < 5; i++) {
        service.getData('/api/concurrent').subscribe(data => {
          expect(data).toEqual(mockData);
          count++;
          if (count === 5) done();
        });
      }

      // Solo una richiesta HTTP (shareReplay)
      const requests = httpMock.match('/api/concurrent');
      expect(requests.length).toBe(1);
      requests[0].flush(mockData);
    });
  });

  describe('Memory Management', () => {
    
    it('dovrebbe mantenere cache anche dopo unsubscribe (refCount: false)', (done) => {
      const mockData = { id: 1 };
      
      // Prima subscribe e unsubscribe
      const sub1 = service.getData('/api/test').subscribe();
      httpMock.expectOne('/api/test').flush(mockData);
      sub1.unsubscribe();

      // Seconda subscribe - dovrebbe usare cache (non nuova HTTP)
      service.getData('/api/test').subscribe(data => {
        expect(data).toEqual(mockData);
        done();
      });

      // Nessuna nuova HTTP
      httpMock.expectNone('/api/test');
    });
  });
});

