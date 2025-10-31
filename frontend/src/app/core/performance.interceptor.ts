import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Performance Interceptor
 * 
 * Optimizes HTTP requests for better performance:
 * - Adds performance headers
 * - Logs request timing (solo in dev)
 * - Prevents duplicate requests
 */
@Injectable()
export class PerformanceInterceptor implements HttpInterceptor {
  
  private requestTimings = new Map<string, number>();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = performance.now();
    const requestId = `${req.method}-${req.url}`;
    
    if (this.requestTimings.has(requestId)) {
      const lastRequest = this.requestTimings.get(requestId)!;
      if (performance.now() - lastRequest < 1000) {
        if (!environment.production) {
          console.warn('Duplicate request prevented:', req.url);
        }
        return next.handle(req);
      }
    }
    
    this.requestTimings.set(requestId, startTime);
    
    // Controlla se la richiesta ha già headers per il bypass della cache
    const hasNoCacheHeader = req.headers.has('Cache-Control') && 
                             req.headers.get('Cache-Control')?.includes('no-cache');
    
    const optimizedReq = req.clone({
      setHeaders: {
        // Se la richiesta ha già headers no-cache, non sovrascriverli
        ...(hasNoCacheHeader ? {} : {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }),
        'Connection': 'keep-alive'
      }
    });

    return next.handle(optimizedReq).pipe(
      tap({
        next: () => {
          const duration = performance.now() - startTime;
          if (!environment.production && duration > 1000) {
            console.warn(`Slow request: ${req.url} took ${duration.toFixed(2)}ms`);
          }
        },
        error: () => {
          if (!environment.production) {
            const duration = performance.now() - startTime;
            console.error(`Failed request: ${req.url} after ${duration.toFixed(2)}ms`);
          }
        },
        finalize: () => {
          this.requestTimings.delete(requestId);
        }
      })
    );
  }
}
