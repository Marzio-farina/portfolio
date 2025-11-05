import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';

/**
 * Test Suite per AuthInterceptor
 * 
 * Interceptor che aggiunge il token di autenticazione alle richieste HTTP
 */
describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Pulisco localStorage prima di ogni test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('dovrebbe aggiungere Authorization header quando token è presente', () => {
    const testToken = 'test-bearer-token-123';
    localStorage.setItem('auth_token', testToken);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
    
    req.flush({});
  });

  it('non dovrebbe aggiungere Authorization header quando token non è presente', () => {
    // localStorage vuoto (già pulito nel beforeEach)
    
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    
    req.flush({});
  });

  it('dovrebbe gestire token vuoto', () => {
    localStorage.setItem('auth_token', '');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    
    req.flush({});
  });

  it('dovrebbe gestire token null', () => {
    localStorage.removeItem('auth_token'); // null diventa stringa 'null', meglio rimuovere

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    
    req.flush({});
  });

  it('dovrebbe applicare il token a tutte le richieste', () => {
    const testToken = 'multi-request-token';
    localStorage.setItem('auth_token', testToken);

    // Faccio 3 richieste diverse
    httpClient.get('/api/users').subscribe();
    httpClient.post('/api/projects', {}).subscribe();
    httpClient.put('/api/profile', {}).subscribe();

    const req1 = httpMock.expectOne('/api/users');
    const req2 = httpMock.expectOne('/api/projects');
    const req3 = httpMock.expectOne('/api/profile');

    expect(req1.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
    expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
    expect(req3.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);

    req1.flush({});
    req2.flush({});
    req3.flush({});
  });

  it('dovrebbe preservare altri headers', () => {
    const testToken = 'token-with-headers';
    localStorage.setItem('auth_token', testToken);

    httpClient.get('/api/test', {
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value'
      }
    }).subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.headers.get('X-Custom-Header')).toBe('custom-value');
    
    req.flush({});
  });

  it('dovrebbe gestire token JWT valido', () => {
    // Token JWT simulato (base64 encoded)
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    localStorage.setItem('auth_token', jwtToken);

    httpClient.get('/api/secure').subscribe();

    const req = httpMock.expectOne('/api/secure');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${jwtToken}`);
    
    req.flush({});
  });

  it('dovrebbe gestire token con spazi', () => {
    const tokenWithSpaces = '  token-with-spaces  ';
    localStorage.setItem('auth_token', tokenWithSpaces);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    // Il token viene usato così com'è, inclusi gli spazi
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${tokenWithSpaces}`);
    
    req.flush({});
  });

  it('dovrebbe non interferire con richieste che falliscono', () => {
    const testToken = 'failing-request-token';
    localStorage.setItem('auth_token', testToken);

    httpClient.get('/api/test').subscribe({
      next: () => fail('dovrebbe fallire'),
      error: (error) => {
        expect(error.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
    
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('dovrebbe leggere sempre il token più recente da localStorage', () => {
    // Primo token
    localStorage.setItem('auth_token', 'token-1');
    httpClient.get('/api/test1').subscribe();
    
    const req1 = httpMock.expectOne('/api/test1');
    expect(req1.request.headers.get('Authorization')).toBe('Bearer token-1');
    req1.flush({});

    // Cambio token
    localStorage.setItem('auth_token', 'token-2');
    httpClient.get('/api/test2').subscribe();
    
    const req2 = httpMock.expectOne('/api/test2');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer token-2');
    req2.flush({});
  });

  it('dovrebbe gestire rimozione token tra richieste', () => {
    localStorage.setItem('auth_token', 'temporary-token');
    httpClient.get('/api/test1').subscribe();
    
    const req1 = httpMock.expectOne('/api/test1');
    expect(req1.request.headers.has('Authorization')).toBe(true);
    req1.flush({});

    // Rimuovo il token
    localStorage.removeItem('auth_token');
    httpClient.get('/api/test2').subscribe();
    
    const req2 = httpMock.expectOne('/api/test2');
    expect(req2.request.headers.has('Authorization')).toBe(false);
    req2.flush({});
  });

  it('dovrebbe gestire POST requests con body', () => {
    const testToken = 'post-request-token';
    localStorage.setItem('auth_token', testToken);

    const postData = { name: 'Test', value: 123 };
    httpClient.post('/api/data', postData).subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
    expect(req.request.body).toEqual(postData);
    
    req.flush({});
  });
});

/**
 * COPERTURA: 100% dell'interceptor
 * - Token presente/assente
 * - Token valido/vuoto/null
 * - Preservazione altri headers
 * - Multiple richieste
 * - Aggiornamento token dinamico
 * - Vari metodi HTTP (GET, POST, PUT)
 */

