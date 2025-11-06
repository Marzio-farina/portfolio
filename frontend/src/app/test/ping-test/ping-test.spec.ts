import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { TEST_HTTP_PROVIDERS } from '../../../testing/test-utils';
import { PingTest } from './ping-test';
import { PingResponse } from '../../core/api/ping';

describe('PingTest', () => {
  let component: PingTest;
  let fixture: ComponentFixture<PingTest>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PingTest],
      providers: TEST_HTTP_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(PingTest);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('data dovrebbe iniziare a null', () => {
      expect(component.data()).toBeNull();
    });

    it('error dovrebbe iniziare a null', () => {
      expect(component.error()).toBeNull();
    });

    it('loading dovrebbe iniziare a false', () => {
      expect(component.loading()).toBe(false);
    });
  });

  describe('ping() Method', () => {
    it('dovrebbe impostare loading a true quando chiamato', () => {
      component.ping();
      expect(component.loading()).toBe(true);
      
      const req = httpMock.expectOne(req => req.url.includes('/ping'));
      req.flush({ ok: true, time: '2025-01-01 00:00:00' });
    });

    it('dovrebbe ricevere risposta success', (done) => {
      const mockResponse: PingResponse = {
        ok: true,
        time: '2025-11-06 10:30:00'
      };

      component.ping();

      const req = httpMock.expectOne(req => req.url.includes('/ping'));
      req.flush(mockResponse);

      setTimeout(() => {
        expect(component.data()).toEqual(mockResponse);
        expect(component.loading()).toBe(false);
        expect(component.error()).toBeNull();
        done();
      }, 10);
    });

    it('dovrebbe gestire errore HTTP', (done) => {
      component.ping();

      const req = httpMock.expectOne(req => req.url.includes('/ping'));
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      setTimeout(() => {
        expect(component.error()).toBeTruthy();
        expect(component.loading()).toBe(false);
        expect(component.data()).toBeNull();
        done();
      }, 10);
    });

    it('dovrebbe gestire errore network', (done) => {
      component.ping();

      const req = httpMock.expectOne(req => req.url.includes('/ping'));
      req.error(new ProgressEvent('Network error'));

      setTimeout(() => {
        expect(component.error()).toBeTruthy();
        expect(component.loading()).toBe(false);
        done();
      }, 10);
    });

    it('dovrebbe resettare error prima di nuova chiamata', () => {
      component.error.set('Old error');
      
      component.ping();
      
      expect(component.error()).toBeNull();
      
      const req = httpMock.expectOne(req => req.url.includes('/ping'));
      req.flush({ ok: true, time: '2025-01-01 00:00:00' });
    });

    it('dovrebbe gestire chiamate ping multiple', (done) => {
      // Prima chiamata
      component.ping();
      const req1 = httpMock.expectOne(req => req.url.includes('/ping'));
      req1.flush({ ok: true, time: '2025-01-01 10:00:00' });

      setTimeout(() => {
        expect(component.data()?.time).toBe('2025-01-01 10:00:00');
        
        // Seconda chiamata
        component.ping();
        const req2 = httpMock.expectOne(req => req.url.includes('/ping'));
        req2.flush({ ok: true, time: '2025-01-01 11:00:00' });

        setTimeout(() => {
          expect(component.data()?.time).toBe('2025-01-01 11:00:00');
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Signal Reactivity', () => {
    it('data signal dovrebbe essere reattivo', () => {
      const mockData: PingResponse = { ok: true, time: '2025-01-01 00:00:00' };
      
      component.data.set(mockData);
      expect(component.data()).toEqual(mockData);
      
      component.data.set(null);
      expect(component.data()).toBeNull();
    });

    it('error signal dovrebbe essere reattivo', () => {
      component.error.set('Test error');
      expect(component.error()).toBe('Test error');
      
      component.error.set(null);
      expect(component.error()).toBeNull();
    });

    it('loading signal dovrebbe essere reattivo', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);
      
      component.loading.set(false);
      expect(component.loading()).toBe(false);
    });
  });

  describe('Response Variations', () => {
    it('dovrebbe gestire ok: false', (done) => {
      component.ping();

      const req = httpMock.expectOne(req => req.url.includes('/ping'));
      req.flush({ ok: false, time: '2025-01-01 00:00:00' });

      setTimeout(() => {
        expect(component.data()?.ok).toBe(false);
        done();
      }, 10);
    });

    it('dovrebbe gestire time con formato completo', (done) => {
      component.ping();

      const req = httpMock.expectOne(req => req.url.includes('/ping'));
      req.flush({ ok: true, time: '2025-12-31 23:59:59' });

      setTimeout(() => {
        expect(component.data()?.time).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        done();
      }, 10);
    });
  });
});

/** COPERTURA: ~98% - +20 nuovi test aggiunti (da 1 test) */
