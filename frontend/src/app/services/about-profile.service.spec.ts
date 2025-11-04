import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MOCK_ACTIVATED_ROUTE } from '../../testing/test-utils';
import { AboutProfileService, PublicProfileDto } from './about-profile.service';

/**
 * Test Suite per AboutProfileService
 */
describe('AboutProfileService', () => {
  let service: AboutProfileService;
  let httpMock: HttpTestingController;

  const mockProfile: PublicProfileDto = {
    id: 1,
    name: 'Mario',
    surname: 'Rossi',
    email: 'mario@test.com',
    title: 'Developer',
    headline: 'Full Stack Developer',
    bio: 'Test bio',
    phone: '+39 123456789',
    location: 'Milano',
    location_url: null,
    avatar_url: 'avatar.jpg',
    date_of_birth: '1990-01-01',
    date_of_birth_it: '01/01/1990',
    age: 34,
    socials: [
      { provider: 'github', handle: 'mario', url: 'https://github.com/mario' }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AboutProfileService,
        provideHttpClient(),
        provideHttpClientTesting(),
        MOCK_ACTIVATED_ROUTE
      ]
    });
    
    service = TestBed.inject(AboutProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('get$()', () => {
    it('dovrebbe recuperare profilo pubblico', (done) => {
      service.get$().subscribe(profile => {
        expect(profile.id).toBe(1);
        expect(profile.name).toBe('Mario');
        expect(profile.socials.length).toBe(1);
        expect(profile.socials[0].provider).toBe('github'); // Lowercase automatico
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/public-profile'));
      req.flush(mockProfile);
    });

    it('dovrebbe recuperare profilo per userId specifico', (done) => {
      service.get$(42).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/users/42/public-profile'));
      req.flush(mockProfile);
    });

    it('dovrebbe cacheare profilo', (done) => {
      // Prima chiamata
      service.get$().subscribe(() => {
        // Seconda chiamata (dovrebbe usare cache)
        service.get$().subscribe(() => {
          done();
        });
      });

      // Solo 1 richiesta HTTP (la seconda usa cache)
      const reqs = httpMock.match(req => req.url.includes('/public-profile'));
      expect(reqs.length).toBe(1);
      reqs[0].flush(mockProfile);
    });

    it('dovrebbe normalizzare social provider in lowercase', (done) => {
      const profileWithUppercase = {
        ...mockProfile,
        socials: [
          { provider: 'GITHUB', handle: 'test', url: 'url' },
          { provider: 'LinkedIn', handle: 'test', url: 'url' }
        ]
      };

      service.get$().subscribe(profile => {
        expect(profile.socials[0].provider).toBe('github');
        expect(profile.socials[1].provider).toBe('linkedin');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/public-profile'));
      req.flush(profileWithUppercase);
    });
  });

  describe('getBySlug()', () => {
    it('dovrebbe recuperare profilo per slug utente', (done) => {
      service.getBySlug('mario-rossi').subscribe(profile => {
        expect(profile.name).toBe('Mario');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/mario-rossi/public-profile'));
      req.flush(mockProfile);
    });

    it('dovrebbe cacheare profilo per slug', (done) => {
      service.getBySlug('test-user').subscribe(() => {
        service.getBySlug('test-user').subscribe(() => {
          done();
        });
      });

      const reqs = httpMock.match(req => req.url.includes('/test-user/public-profile'));
      expect(reqs.length).toBe(1); // Solo 1 chiamata (cache)
      reqs[0].flush(mockProfile);
    });
  });
});

/**
 * COPERTURA: ~75% del servizio
 * - get$ con/senza userId
 * - getBySlug
 * - Caching logic
 * - Social normalization
 */

