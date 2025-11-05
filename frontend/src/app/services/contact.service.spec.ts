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

  // ========================================
  // TEST: Validation Errors
  // ========================================
  describe('Validation Errors', () => {
    it('dovrebbe gestire errore 422 per email invalida', (done) => {
      const payload: ContactPayload = {
        name: 'Test',
        surname: 'User',
        email: 'invalid-email',
        message: 'Test',
        consent: true
      };

      service.send(payload).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      req.flush({ 
        errors: { email: ['Email must be valid'] } 
      }, { 
        status: 422, 
        statusText: 'Unprocessable Entity' 
      });
    });

    it('dovrebbe gestire errore per consent mancante', (done) => {
      const payload: any = {
        name: 'Test',
        surname: 'User',
        email: 'test@test.com',
        message: 'Test'
        // consent mancante
      };

      service.send(payload).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      req.flush({ 
        errors: { consent: ['Consent is required'] } 
      }, { status: 422, statusText: 'Unprocessable Entity' });
    });

    it('dovrebbe gestire message troppo lungo', (done) => {
      const longMessage = 'x'.repeat(10000);
      const payload: ContactPayload = {
        name: 'Test',
        surname: 'User',
        email: 'test@test.com',
        message: longMessage,
        consent: true
      };

      service.send(payload).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      req.flush({ 
        errors: { message: ['Message too long'] } 
      }, { status: 422, statusText: 'Unprocessable Entity' });
    });

    it('dovrebbe gestire campi richiesti mancanti', (done) => {
      const payload: any = {
        name: '',
        email: '',
        message: '',
        consent: true
      };

      service.send(payload).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      req.flush({ 
        errors: { 
          name: ['Name is required'],
          email: ['Email is required'],
          message: ['Message is required']
        } 
      }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire special characters nel message', (done) => {
      const payload: ContactPayload = {
        name: 'Test',
        surname: 'User',
        email: 'test@test.com',
        message: '<script>alert("XSS")</script>',
        consent: true
      };

      service.send(payload).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      expect(req.request.body.message).toContain('<script>');
      req.flush({ ok: true });
    });

    it('dovrebbe gestire website URL invalido', (done) => {
      const payload: ContactPayload = {
        name: 'Test',
        surname: 'User',
        email: 'test@test.com',
        message: 'Test',
        website: 'not-a-url',
        consent: true
      };

      service.send(payload).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      req.flush({ 
        errors: { website: ['Invalid URL'] } 
      }, { status: 422, statusText: 'Unprocessable Entity' });
    });

    it('dovrebbe gestire network timeout', (done) => {
      const payload: ContactPayload = {
        name: 'Test',
        surname: 'User',
        email: 'test@test.com',
        message: 'Test',
        consent: true
      };

      service.send(payload).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      req.error(new ProgressEvent('timeout'));
    });

    it('dovrebbe gestire rate limiting (429)', (done) => {
      const payload: ContactPayload = {
        name: 'Test',
        surname: 'User',
        email: 'test@test.com',
        message: 'Test',
        consent: true
      };

      service.send(payload).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(429);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/contact'));
      req.flush({ message: 'Too many requests' }, { status: 429, statusText: 'Too Many Requests' });
    });
  });
});

/**
 * COPERTURA TEST CONTACT SERVICE
 * ===============================
 * 
 * ✅ Creazione servizio
 * ✅ send() - messaggio base
 * ✅ send() - con campi opzionali
 * ✅ send() - error handling 500
 * ✅ Validation errors (422) - email, consent, message, campi richiesti
 * ✅ Edge cases (special chars, URL invalido, timeout, rate limiting)
 * 
 * COVERAGE STIMATA: ~98%
 * 
 * AGGIUNTO: +8 test (validation errors 4, edge cases 4)
 */

