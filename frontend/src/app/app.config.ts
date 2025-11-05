import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ApiInterceptor } from './core/api/http.interceptor';
import { AuthInterceptor } from './core/auth.interceptor';
import { ErrorHandlerInterceptor } from './core/error-handler.interceptor';
import { GlobalErrorHandler } from './core/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    // Global Error Handler per errori non catturati
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // ORDINE: Api(retry/timeout) → Auth → ErrorHandler
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor,     multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor,    multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorHandlerInterceptor, multi: true },
    // Image Loader per NgOptimizedImage - supporta URL assoluti
    {
      provide: IMAGE_LOADER,
      useValue: (config: ImageLoaderConfig) => {
        // Se l'URL è già assoluto, ritornalo così com'è
        if (config.src.startsWith('http://') || config.src.startsWith('https://')) {
          return config.src;
        }
        // Altrimenti costruisci URL relativo
        return config.src;
      }
    },
  ]
};
