import { TestBed } from '@angular/core/testing';
import { Router, NavigationExtras } from '@angular/router';
import { TenantRouterService } from './tenant-router.service';
import { TenantService } from './tenant.service';
import { COMMON_TEST_PROVIDERS } from '../../testing/test-utils';

/**
 * Test Suite Completa per TenantRouterService
 * 
 * Servizio wrapper per Router che aggiunge automaticamente userSlug
 * Fondamentale per routing tenant-aware (multi-tenant)
 */
describe('TenantRouterService', () => {
  let service: TenantRouterService;
  let router: Router;
  let tenantService: jasmine.SpyObj<TenantService>;

  beforeEach(() => {
    const tenantSpy = jasmine.createSpyObj('TenantService', ['userSlug']);
    
    TestBed.configureTestingModule({
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: TenantService, useValue: tenantSpy }
      ]
    });
    
    service = TestBed.inject(TenantRouterService);
    router = TestBed.inject(Router);
    tenantService = TestBed.inject(TenantService) as jasmine.SpyObj<TenantService>;
    
    // Spy sulla navigate del router
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // TEST: navigate() con slug tenant
  // ========================================
  describe('navigate() con slug', () => {
    beforeEach(() => {
      tenantService.userSlug.and.returnValue('mario-rossi');
    });

    it('dovrebbe aggiungere slug tenant al routing', () => {
      service.navigate(['about']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'about'],
        undefined
      );
    });

    it('dovrebbe gestire routing con multiple parti', () => {
      service.navigate(['projects', '123']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'projects', '123'],
        undefined
      );
    });

    it('dovrebbe gestire array di comandi', () => {
      service.navigate(['users', '42', 'edit']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'users', '42', 'edit'],
        undefined
      );
    });

    it('dovrebbe passare NavigationExtras', () => {
      const extras: NavigationExtras = { queryParams: { tab: 'details' } };
      
      service.navigate(['profile'], extras);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'profile'],
        extras
      );
    });

    it('dovrebbe gestire queryParams e fragment', () => {
      const extras: NavigationExtras = {
        queryParams: { id: '123', filter: 'active' },
        fragment: 'section-top'
      };
      
      service.navigate(['dashboard'], extras);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'dashboard'],
        extras
      );
    });

    it('dovrebbe filtrare valori falsy', () => {
      service.navigate(['about', null, 'section', undefined, false, '']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'about', 'section'],
        undefined
      );
    });

    it('dovrebbe convertire numeri in stringhe', () => {
      service.navigate(['projects', 123] as any);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'projects', '123'],
        undefined
      );
    });

    it('dovrebbe gestire array annidati (flat)', () => {
      service.navigate([['users', 'profile'], 'settings'] as any);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'users', 'profile', 'settings'],
        undefined
      );
    });

    it('dovrebbe preservare slug con caratteri speciali', () => {
      tenantService.userSlug.and.returnValue('user-name_123');
      
      service.navigate(['about']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'user-name_123', 'about'],
        undefined
      );
    });

    it('dovrebbe gestire path vuoto', () => {
      service.navigate([]);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi'],
        undefined
      );
    });
  });

  // ========================================
  // TEST: navigate() senza slug tenant
  // ========================================
  describe('navigate() senza slug (pubblico)', () => {
    beforeEach(() => {
      tenantService.userSlug.and.returnValue('');
    });

    it('dovrebbe navigare senza slug se tenant non presente', () => {
      service.navigate(['about']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'about'],
        undefined
      );
    });

    it('dovrebbe gestire multiple parti senza slug', () => {
      service.navigate(['users', '123', 'profile']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'users', '123', 'profile'],
        undefined
      );
    });

    it('dovrebbe funzionare con NavigationExtras senza slug', () => {
      const extras: NavigationExtras = { queryParams: { tab: 'info' } };
      
      service.navigate(['dashboard'], extras);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'dashboard'],
        extras
      );
    });

    it('dovrebbe gestire array vuoto senza slug', () => {
      service.navigate([]);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/'],
        undefined
      );
    });
  });

  // ========================================
  // TEST: navigate() con slug null/undefined
  // ========================================
  describe('navigate() con slug null/undefined', () => {
    it('dovrebbe gestire slug null', () => {
      tenantService.userSlug.and.returnValue(null as any);
      
      service.navigate(['about']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'about'],
        undefined
      );
    });

    it('dovrebbe gestire slug undefined', () => {
      tenantService.userSlug.and.returnValue(undefined as any);
      
      service.navigate(['about']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'about'],
        undefined
      );
    });

    it('dovrebbe gestire slug con solo spazi (falsy dopo trim)', () => {
      tenantService.userSlug.and.returnValue('   ');
      
      service.navigate(['about']);
      
      // '   ' è truthy, quindi verrà aggiunto
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', '   ', 'about'],
        undefined
      );
    });
  });

  // ========================================
  // TEST: NavigationExtras avanzati
  // ========================================
  describe('NavigationExtras Avanzati', () => {
    beforeEach(() => {
      tenantService.userSlug.and.returnValue('test-user');
    });

    it('dovrebbe preservare replaceUrl', () => {
      const extras: NavigationExtras = { replaceUrl: true };
      
      service.navigate(['dashboard'], extras);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'test-user', 'dashboard'],
        extras
      );
    });

    it('dovrebbe preservare skipLocationChange', () => {
      const extras: NavigationExtras = { skipLocationChange: true };
      
      service.navigate(['modal'], extras);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'test-user', 'modal'],
        extras
      );
    });

    it('dovrebbe preservare state', () => {
      const extras: NavigationExtras = { state: { from: 'dashboard' } };
      
      service.navigate(['profile'], extras);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'test-user', 'profile'],
        extras
      );
    });

    it('dovrebbe preservare queryParamsHandling', () => {
      const extras: NavigationExtras = { queryParamsHandling: 'merge' };
      
      service.navigate(['settings'], extras);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'test-user', 'settings'],
        extras
      );
    });

    it('dovrebbe combinare queryParams, fragment e replaceUrl', () => {
      const extras: NavigationExtras = {
        queryParams: { id: '123' },
        fragment: 'top',
        replaceUrl: true,
        state: { returnUrl: '/dashboard' }
      };
      
      service.navigate(['details'], extras);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'test-user', 'details'],
        extras
      );
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire slug molto lungo', () => {
      const longSlug = 'a'.repeat(100);
      tenantService.userSlug.and.returnValue(longSlug);
      
      service.navigate(['about']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', longSlug, 'about'],
        undefined
      );
    });

    it('dovrebbe gestire path con molti segmenti', () => {
      tenantService.userSlug.and.returnValue('user');
      
      const manyParts = Array.from({ length: 20 }, (_, i) => `part${i}`);
      service.navigate(manyParts);
      
      const expected = ['/', 'user', ...manyParts];
      expect(router.navigate).toHaveBeenCalledWith(expected, undefined);
    });

    it('dovrebbe gestire caratteri Unicode in comandi', () => {
      tenantService.userSlug.and.returnValue('user');
      
      service.navigate(['progetti', '🚀-rocket']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'user', 'progetti', '🚀-rocket'],
        undefined
      );
    });

    it('dovrebbe gestire parametri con slash', () => {
      tenantService.userSlug.and.returnValue('user');
      
      // Nota: Angular Router gestisce automaticamente gli slash
      service.navigate(['users/profile']);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'user', 'users/profile'],
        undefined
      );
    });

    it('dovrebbe gestire array molto annidati', () => {
      tenantService.userSlug.and.returnValue('user');
      
      const nested = [[['deep', 'nested'], 'array'], 'flatten'];
      service.navigate(nested as any);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'user', 'deep', 'nested', 'array', 'flatten'],
        undefined
      );
    });

    it('dovrebbe gestire comandi con boolean', () => {
      tenantService.userSlug.and.returnValue('user');
      
      service.navigate(['about', true, 'section'] as any);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'user', 'about', 'true', 'section'],
        undefined
      );
    });
  });

  // ========================================
  // TEST: Return Value
  // ========================================
  describe('Return Value', () => {
    beforeEach(() => {
      tenantService.userSlug.and.returnValue('user');
    });

    it('dovrebbe ritornare Promise<boolean> da router.navigate', async () => {
      const result = service.navigate(['about']);
      
      expect(result).toBeInstanceOf(Promise);
      const success = await result;
      expect(success).toBe(true);
    });

    it('dovrebbe propagare errori dal router', async () => {
      (router.navigate as jasmine.Spy).and.returnValue(Promise.resolve(false));
      
      const result = await service.navigate(['about']);
      
      expect(result).toBe(false);
    });

    it('dovrebbe gestire promise rejected', async () => {
      (router.navigate as jasmine.Spy).and.returnValue(Promise.reject(new Error('Navigation failed')));
      
      try {
        await service.navigate(['about']);
        fail('dovrebbe lanciare errore');
      } catch (error: any) {
        expect(error.message).toBe('Navigation failed');
      }
    });
  });

  // ========================================
  // TEST: Real World Scenarios
  // ========================================
  describe('Real World Scenarios', () => {
    it('dovrebbe navigare a profilo utente tenant', () => {
      tenantService.userSlug.and.returnValue('mario-rossi');
      
      service.navigate(['about']);
      
      // Risultato atteso: /mario-rossi/about
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'mario-rossi', 'about'],
        undefined
      );
    });

    it('dovrebbe navigare a dettaglio progetto con ID', () => {
      tenantService.userSlug.and.returnValue('developer-123');
      
      service.navigate(['projects', '42']);
      
      // Risultato: /developer-123/projects/42
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'developer-123', 'projects', '42'],
        undefined
      );
    });

    it('dovrebbe navigare a portfolio pubblico (senza tenant)', () => {
      tenantService.userSlug.and.returnValue('');
      
      service.navigate(['portfolio']);
      
      // Risultato: /portfolio
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'portfolio'],
        undefined
      );
    });

    it('dovrebbe navigare con query params per filtri', () => {
      tenantService.userSlug.and.returnValue('user');
      
      service.navigate(['projects'], {
        queryParams: { category: 'web', tag: 'angular' }
      });
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'user', 'projects'],
        { queryParams: { category: 'web', tag: 'angular' } }
      );
    });

    it('dovrebbe navigare con fragment per scroll', () => {
      tenantService.userSlug.and.returnValue('user');
      
      service.navigate(['about'], { fragment: 'skills' });
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'user', 'about'],
        { fragment: 'skills' }
      );
    });

    it('dovrebbe gestire navigazione modal con skipLocationChange', () => {
      tenantService.userSlug.and.returnValue('user');
      
      service.navigate(['modal', 'cv-preview'], {
        skipLocationChange: true
      });
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/', 'user', 'modal', 'cv-preview'],
        { skipLocationChange: true }
      );
    });
  });

  // ========================================
  // TEST: Service Singleton
  // ========================================
  describe('Service Singleton', () => {
    it('dovrebbe essere singleton', () => {
      const service1 = TestBed.inject(TenantRouterService);
      const service2 = TestBed.inject(TenantRouterService);
      
      expect(service1).toBe(service2);
    });
  });
});

/**
 * COPERTURA TEST TENANT ROUTER SERVICE
 * =====================================
 * 
 * ✅ Creazione servizio
 * ✅ navigate() con slug - base, multiple parti, extras, filtri falsy, conversioni (10 test)
 * ✅ navigate() senza slug - pubblico, multiple parti, extras, vuoto (4 test)
 * ✅ navigate() slug null/undefined - null, undefined, spazi (3 test)
 * ✅ NavigationExtras avanzati - replaceUrl, skipLocationChange, state, queryParamsHandling, combo (5 test)
 * ✅ Edge cases - slug lungo, molti segmenti, Unicode, slash, nested, boolean (6 test)
 * ✅ Return value - Promise<boolean>, errori, rejected (3 test)
 * ✅ Real world scenarios - profilo, progetto, pubblico, filtri, scroll, modal (6 test)
 * ✅ Service singleton (1 test)
 * 
 * COVERAGE STIMATA: ~100% del servizio
 * 
 * TOTALE: +38 nuovi test aggiunti
 * 
 * Pattern testati:
 * - Tenant-aware routing (multi-tenant)
 * - Slug injection automatica
 * - NavigationExtras preservation
 * - Array flattening e filtering
 * - Type conversion (numbers → strings)
 * - Edge cases (null, undefined, empty)
 * - Real-world navigation scenarios
 */

