import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TenantLinkPipe } from './tenant-link.pipe';
import { TenantService } from '../../services/tenant.service';

/**
 * Test Suite per TenantLinkPipe
 * 
 * Pipe che costruisce link tenant-aware aggiungendo lo slug utente
 */
describe('TenantLinkPipe', () => {
  let pipe: TenantLinkPipe;
  let tenantServiceSpy: jasmine.SpyObj<TenantService>;

  beforeEach(() => {
    // Creo spy con signal
    tenantServiceSpy = jasmine.createSpyObj('TenantService', [], {
      userSlug: signal('mario-rossi')
    });

    TestBed.configureTestingModule({
      providers: [
        TenantLinkPipe,
        { provide: TenantService, useValue: tenantServiceSpy }
      ]
    });

    pipe = TestBed.inject(TenantLinkPipe);
  });

  it('dovrebbe creare la pipe', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform()', () => {
    it('dovrebbe aggiungere slug a singolo segmento string', () => {
      const result = pipe.transform('about');
      expect(result).toEqual(['/', 'mario-rossi', 'about']);
    });

    it('dovrebbe aggiungere slug ad array di segmenti', () => {
      const result = pipe.transform(['progetti', 'dettaglio', '123']);
      expect(result).toEqual(['/', 'mario-rossi', 'progetti', 'dettaglio', '123']);
    });

    it('dovrebbe gestire stringa vuota', () => {
      const result = pipe.transform('');
      expect(result).toEqual(['/', 'mario-rossi']);
    });

    it('dovrebbe gestire array vuoto', () => {
      const result = pipe.transform([]);
      expect(result).toEqual(['/', 'mario-rossi']);
    });

    it('dovrebbe gestire slug null/undefined (senza tenant)', () => {
      // Modifico il signal per restituire null
      Object.defineProperty(tenantServiceSpy, 'userSlug', {
        value: signal(null)
      });

      const result = pipe.transform('about');
      expect(result).toEqual(['/', 'about']);
    });

    it('dovrebbe gestire slug vuoto (senza tenant)', () => {
      Object.defineProperty(tenantServiceSpy, 'userSlug', {
        value: signal('')
      });

      const result = pipe.transform(['progetti', '42']);
      expect(result).toEqual(['/', 'progetti', '42']);
    });

    it('dovrebbe filtrare valori falsy nell\'array', () => {
      const result = pipe.transform(['about', null, '', undefined, 'section'] as any);
      expect(result).toEqual(['/', 'mario-rossi', 'about', 'section']);
    });

    it('dovrebbe convertire numeri in stringhe', () => {
      const result = pipe.transform([123, 456] as any);
      expect(result).toEqual(['/', 'mario-rossi', '123', '456']);
    });

    it('dovrebbe gestire oggetti convertendoli in stringhe', () => {
      const result = pipe.transform([{ id: 42 }] as any);
      expect(result).toEqual(['/', 'mario-rossi', '[object Object]']);
    });

    it('dovrebbe gestire slug con caratteri speciali', () => {
      Object.defineProperty(tenantServiceSpy, 'userSlug', {
        value: signal('mario-rossi-123')
      });

      const result = pipe.transform('curriculum');
      expect(result).toEqual(['/', 'mario-rossi-123', 'curriculum']);
    });

    it('dovrebbe gestire path complessi', () => {
      const result = pipe.transform(['progetti', 'categoria', 'web', 'item', '5']);
      expect(result).toEqual(['/', 'mario-rossi', 'progetti', 'categoria', 'web', 'item', '5']);
    });

    it('dovrebbe mantenere root slash', () => {
      const result = pipe.transform('home');
      expect(result[0]).toBe('/');
    });

    it('dovrebbe essere impure per ricalcolare con signal', () => {
      // Verifica che la pipe sia impure (pure: false nel decorator)
      const metadata = (TenantLinkPipe as any).ɵpipe;
      expect(metadata.pure).toBe(false);
    });

    it('dovrebbe gestire chiamate multiple con stesso input', () => {
      const result1 = pipe.transform('about');
      const result2 = pipe.transform('about');
      
      expect(result1).toEqual(['/', 'mario-rossi', 'about']);
      expect(result2).toEqual(['/', 'mario-rossi', 'about']);
    });

    it('dovrebbe gestire array con un solo elemento', () => {
      const result = pipe.transform(['home']);
      expect(result).toEqual(['/', 'mario-rossi', 'home']);
    });

    it('dovrebbe normalizzare input misti', () => {
      // La pipe usa .filter(Boolean), quindi rimuove 0, false, null, undefined
      const result = pipe.transform(['about', 0, false, 'section', null] as any);
      // Solo 'about' e 'section' vengono mantenuti (0, false, null sono falsy e vengono filtrati)
      expect(result).toEqual(['/', 'mario-rossi', 'about', 'section']);
    });
  });
});

/**
 * COPERTURA: 100% della pipe
 * - Transform con string e array
 * - Slug presente/assente
 * - Filtraggio valori falsy
 * - Conversione tipi
 * - Edge cases
 * - Verifica impure
 */

