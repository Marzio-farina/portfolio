import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AvatarService } from './avatar.service';

/**
 * Test AvatarService
 */
describe('AvatarService', () => {
  let service: AvatarService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AvatarService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(AvatarService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('getAvatars()', () => {
    it('dovrebbe recuperare lista avatar default', (done) => {
      const mockResponse = {
        avatars: [
          { id: 1, img: 'avatar1.jpg', alt: 'Avatar 1' },
          { id: 2, img: 'avatar2.jpg', alt: 'Avatar 2' }
        ]
      };

      service.getAvatars().subscribe(avatars => {
        expect(avatars.length).toBe(2);
        expect(avatars[0].img).toBe('avatar1.jpg');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/testimonials/default-avatars'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});

