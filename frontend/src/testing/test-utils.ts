/**
 * Test Utilities - Provider e Mock comuni per i test
 * 
 * Questo file contiene:
 * - Provider comuni (HttpClient, ActivatedRoute, etc.)
 * - Mock di servizi
 * - Helper per setup test
 */

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

/**
 * Provider HTTP per i test
 * Usa questo quando i componenti/servizi richiedono HttpClient
 */
export const TEST_HTTP_PROVIDERS = [
  provideHttpClient(),
  provideHttpClientTesting()
];

/**
 * Mock di ActivatedRoute
 * Usa questo quando i componenti richiedono ActivatedRoute
 */
export const MOCK_ACTIVATED_ROUTE = {
  provide: ActivatedRoute,
  useValue: {
    snapshot: {
      params: {},
      queryParams: {},
      data: {},
      paramMap: {
        get: () => null,
        has: () => false,
        getAll: () => [],
        keys: []
      }
    },
    params: of({}),
    queryParams: of({}),
    queryParamMap: of({
      get: () => null,
      has: () => false,
      getAll: () => [],
      keys: []
    }),
    paramMap: of({
      get: () => null,
      has: () => false,
      getAll: () => [],
      keys: []
    }),
    data: of({})
  }
};

/**
 * Combinazione di tutti i provider comuni
 * Usa questo per componenti che richiedono sia HTTP che routing
 */
export const COMMON_TEST_PROVIDERS = [
  ...TEST_HTTP_PROVIDERS,
  MOCK_ACTIVATED_ROUTE
];

/**
 * Helper per attendere async operations nei test
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper per triggerare change detection
 */
export function detectChanges(fixture: any): void {
  fixture.detectChanges();
  fixture.whenStable().then(() => fixture.detectChanges());
}

