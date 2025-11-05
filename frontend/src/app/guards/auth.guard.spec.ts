import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { TenantRouterService } from '../services/tenant-router.service';

/**
 * Test Suite per authGuard
 * 
 * Guard che protegge le rotte richiedendo autenticazione
 */
describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let tenantRouter: jasmine.SpyObj<TenantRouterService>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    // Creo spy objects per i servizi
    authService = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    tenantRouter = jasmine.createSpyObj('TenantRouterService', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TenantRouterService, useValue: tenantRouter }
      ]
    });

    // Mock route e state
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/dashboard' } as RouterStateSnapshot;
  });

  it('dovrebbe permettere accesso se utente è autenticato', () => {
    authService.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => 
      authGuard(mockRoute, mockState)
    );

    expect(result).toBe(true);
    expect(authService.isAuthenticated).toHaveBeenCalled();
    expect(tenantRouter.navigate).not.toHaveBeenCalled();
  });

  it('dovrebbe bloccare accesso se utente non è autenticato', () => {
    authService.isAuthenticated.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => 
      authGuard(mockRoute, mockState)
    );

    expect(result).toBe(false);
    expect(authService.isAuthenticated).toHaveBeenCalled();
  });

  it('dovrebbe reindirizzare a about con toast se utente non autenticato', () => {
    authService.isAuthenticated.and.returnValue(false);

    TestBed.runInInjectionContext(() => 
      authGuard(mockRoute, mockState)
    );

    expect(tenantRouter.navigate).toHaveBeenCalledWith(['about'], {
      state: {
        toast: {
          message: 'Non autorizzato',
          type: 'error'
        }
      }
    });
  });

  it('dovrebbe chiamare isAuthenticated una sola volta', () => {
    authService.isAuthenticated.and.returnValue(true);

    TestBed.runInInjectionContext(() => 
      authGuard(mockRoute, mockState)
    );

    expect(authService.isAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('dovrebbe gestire route diverse mantenendo stesso comportamento', () => {
    authService.isAuthenticated.and.returnValue(false);
    const differentState = { url: '/progetti' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => 
      authGuard(mockRoute, differentState)
    );

    expect(result).toBe(false);
    expect(tenantRouter.navigate).toHaveBeenCalledWith(['about'], jasmine.any(Object));
  });
});

/**
 * COPERTURA: 100% del guard
 * - Caso autenticato
 * - Caso non autenticato
 * - Redirect con toast
 * - Verifica chiamate ai servizi
 */

