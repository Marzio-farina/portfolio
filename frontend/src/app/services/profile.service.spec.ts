import { TestBed } from '@angular/core/testing';
import { ProfileService, ProfileData } from './profile.service';
import { AboutProfileService } from './about-profile.service';
import { of } from 'rxjs';

/**
 * Test Suite per ProfileService
 * 
 * Servizio che gestisce i dati del profilo utente
 */
describe('ProfileService', () => {
  let service: ProfileService;
  let aboutServiceSpy: jasmine.SpyObj<AboutProfileService>;

  const mockProfileData: ProfileData = {
    id: 1,
    name: 'Mario',
    surname: 'Rossi',
    email: 'mario@test.com',
    title: 'Developer',
    bio: 'Test bio',
    phone: '+39 123456789',
    location: 'Milano',
    avatar_url: 'avatar.jpg',
    date_of_birth: '1990-01-01',
    date_of_birth_it: '01/01/1990',
    age: 34,
    socials: [
      { provider: 'github', handle: 'mario', url: 'https://github.com/mario' }
    ]
  };

  beforeEach(() => {
    // Creo spy per AboutProfileService
    aboutServiceSpy = jasmine.createSpyObj('AboutProfileService', ['get$']);

    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: AboutProfileService, useValue: aboutServiceSpy }
      ]
    });

    service = TestBed.inject(ProfileService);
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('getProfile$()', () => {
    it('dovrebbe recuperare il profilo senza userId', (done) => {
      aboutServiceSpy.get$.and.returnValue(of(mockProfileData as any));

      service.getProfile$().subscribe(profile => {
        expect(profile).toBeTruthy();
        expect(profile.id).toBe(1);
        expect(profile.name).toBe('Mario');
        expect(profile.email).toBe('mario@test.com');
        done();
      });

      expect(aboutServiceSpy.get$).toHaveBeenCalledWith(undefined);
    });

    it('dovrebbe recuperare il profilo con userId specifico', (done) => {
      aboutServiceSpy.get$.and.returnValue(of(mockProfileData as any));

      service.getProfile$(42).subscribe(profile => {
        expect(profile).toBeTruthy();
        expect(profile.id).toBe(1);
        done();
      });

      expect(aboutServiceSpy.get$).toHaveBeenCalledWith(42);
    });

    it('dovrebbe delegare la chiamata ad AboutProfileService', (done) => {
      aboutServiceSpy.get$.and.returnValue(of(mockProfileData as any));

      service.getProfile$().subscribe(() => {
        expect(aboutServiceSpy.get$).toHaveBeenCalled();
        done();
      });
    });

    it('dovrebbe restituire dati completi del profilo', (done) => {
      aboutServiceSpy.get$.and.returnValue(of(mockProfileData as any));

      service.getProfile$().subscribe(profile => {
        expect(profile.name).toBe('Mario');
        expect(profile.surname).toBe('Rossi');
        expect(profile.title).toBe('Developer');
        expect(profile.bio).toBe('Test bio');
        expect(profile.phone).toBe('+39 123456789');
        expect(profile.location).toBe('Milano');
        expect(profile.avatar_url).toBe('avatar.jpg');
        expect(profile.age).toBe(34);
        expect(profile.socials?.length).toBe(1);
        done();
      });
    });

    it('dovrebbe gestire profilo con dati sociali multipli', (done) => {
      const profileWithMultipleSocials: ProfileData = {
        ...mockProfileData,
        socials: [
          { provider: 'github', handle: 'mario', url: 'https://github.com/mario' },
          { provider: 'linkedin', handle: 'mario-rossi', url: 'https://linkedin.com/in/mario-rossi' },
          { provider: 'twitter', handle: '@mario', url: 'https://twitter.com/mario' }
        ]
      };

      aboutServiceSpy.get$.and.returnValue(of(profileWithMultipleSocials as any));

      service.getProfile$().subscribe(profile => {
        expect(profile.socials?.length).toBe(3);
        expect(profile.socials?.[0].provider).toBe('github');
        expect(profile.socials?.[1].provider).toBe('linkedin');
        expect(profile.socials?.[2].provider).toBe('twitter');
        done();
      });
    });

    it('dovrebbe gestire profilo senza dati opzionali', (done) => {
      const minimalProfile: ProfileData = {
        id: 2,
        name: 'Test',
        surname: 'User',
        email: 'test@example.com'
      };

      aboutServiceSpy.get$.and.returnValue(of(minimalProfile as any));

      service.getProfile$().subscribe(profile => {
        expect(profile.id).toBe(2);
        expect(profile.name).toBe('Test');
        expect(profile.title).toBeUndefined();
        expect(profile.bio).toBeUndefined();
        expect(profile.socials).toBeUndefined();
        done();
      });
    });

    it('dovrebbe gestire profilo con socials vuoto', (done) => {
      const profileWithEmptySocials: ProfileData = {
        ...mockProfileData,
        socials: []
      };

      aboutServiceSpy.get$.and.returnValue(of(profileWithEmptySocials as any));

      service.getProfile$().subscribe(profile => {
        expect(profile.socials).toEqual([]);
        expect(profile.socials?.length).toBe(0);
        done();
      });
    });

    it('dovrebbe chiamare get$ una sola volta per chiamata', (done) => {
      aboutServiceSpy.get$.and.returnValue(of(mockProfileData as any));

      service.getProfile$(5).subscribe(() => {
        expect(aboutServiceSpy.get$).toHaveBeenCalledTimes(1);
        expect(aboutServiceSpy.get$).toHaveBeenCalledWith(5);
        done();
      });
    });
  });
});

/**
 * COPERTURA: 100% del servizio
 * - getProfile$ con/senza userId
 * - Delegazione ad AboutProfileService
 * - Gestione dati completi e parziali
 * - Edge cases
 */

