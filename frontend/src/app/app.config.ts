import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ApiInterceptor } from './core/api/http.interceptor';
import { ApiCacheInterceptor } from './core/api-cache.interceptor';
import { AuthInterceptor } from './core/auth.interceptor';
import { ErrorHandlerInterceptor } from './core/error-handler.interceptor';
import { PerformanceInterceptor } from './core/performance.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    // ORDINE OTTIMIZZATO: Performance → Api(retry/headers) → Auth → ErrorHandler
    // (per RESPONSE sarà l'inverso: ErrorHandler → Auth → Api → Performance)
    { provide: HTTP_INTERCEPTORS, useClass: PerformanceInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor,     multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor,    multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorHandlerInterceptor, multi: true },
  ]
};
