import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SocialAccountService } from './social-account.service';

describe('SocialAccountService', () => {
  let service: SocialAccountService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(SocialAccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  describe('upsert$()', () => {
    it('dovrebbe creare/aggiornare social account', (done) => {
      const data: any = {
        provider: 'github',
        url: 'https://github.com/test',
        handle: 'testuser'
      };

      service.upsert$(data).subscribe(account => {
        expect(account.provider).toBe('github');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/social-accounts'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body.provider).toBe('github');
      req.flush({ provider: 'github', url: 'https://github.com/test', handle: 'testuser' });
    });

    it('dovrebbe gestire errore validation', (done) => {
      service.upsert$({ provider: '' }).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error: any) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/social-accounts'));
      req.flush({ message: 'Validation failed' }, { status: 422, statusText: 'Unprocessable' });
    });
  });

  describe('delete$()', () => {
    it('dovrebbe eliminare social account', (done) => {
      service.delete$('twitter').subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/social-accounts/twitter'));
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Deleted' });
    });
  });
});

