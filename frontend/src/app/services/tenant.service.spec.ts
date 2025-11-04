import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TenantService } from './tenant.service';

/**
 * Test TenantService - Multi-tenancy
 */
describe('TenantService', () => {
  let service: TenantService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TenantService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(TenantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    const pending = httpMock.match(() => true);
    pending.forEach(req => req.flush({}));
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe inizializzare con userId e userSlug null', () => {
    expect(service.userId()).toBe(null);
    expect(service.userSlug()).toBe(null);
  });

  describe('setTenant()', () => {
    it('dovrebbe impostare slug e id tenant', () => {
      service.setTenant('mario-rossi', 42);
      
      expect(service.userSlug()).toBe('mario-rossi');
      expect(service.userId()).toBe(42);
    });
  });

  describe('clear()', () => {
    it('dovrebbe pulire tenant', () => {
      service.setTenant('test-user', 10);
      expect(service.userId()).toBe(10);
      
      service.clear();
      
      expect(service.userId()).toBe(null);
      expect(service.userSlug()).toBe(null);
    });
  });

  describe('resolveSlug$()', () => {
    it('dovrebbe risolvere slug in userId', (done) => {
      service.resolveSlug$('john-doe').subscribe(result => {
        expect(result.id).toBe(99);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/john-doe/public-profile'));
      req.flush({ id: 99, name: 'John', email: 'john@test.com' });
    });
  });
});

