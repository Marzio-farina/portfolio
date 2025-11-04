import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ContactService, ContactPayload } from './contact.service';

/**
 * Test ContactService - Form contatti
 */
describe('ContactService', () => {
  let service: ContactService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContactService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(ContactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('send()', () => {
    it('dovrebbe inviare messaggio contatto', (done) => {
      const payload: ContactPayload = {
        name: 'Mario',
        surname: 'Rossi',
        email: 'mario@test.com',
        subject: 'Test Subject',
        message: 'Test message',
        consent: true
      };

      service.send(payload).subscribe(response => {
        expect(response.ok).toBe(true);
        expect(response.id).toBe('msg-123');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body.name).toBe('Mario');
      expect(req.request.body.consent).toBe(true);
      
      req.flush({ ok: true, id: 'msg-123' });
    });

    it('dovrebbe includere campi opzionali se presenti', (done) => {
      const payload: ContactPayload = {
        name: 'Test',
        surname: 'User',
        email: 'test@test.com',
        message: 'Hello',
        consent: true,
        website: 'https://test.com',
        toEmail: 'recipient@test.com'
      };

      service.send(payload).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      expect(req.request.body.website).toBe('https://test.com');
      expect(req.request.body.toEmail).toBe('recipient@test.com');
      
      req.flush({ ok: true });
    });

    it('dovrebbe gestire errori', (done) => {
      const payload: ContactPayload = {
        name: 'Error',
        surname: 'Test',
        email: 'error@test.com',
        message: 'Fail',
        consent: true
      };

      service.send(payload).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});

// COPERTURA: 100%

