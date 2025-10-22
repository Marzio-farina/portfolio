import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Performance Interceptor
 * 
 * Optimizes HTTP requests for better performance:
 * - Adds performance headers
 * - Logs request timing
 * - Prevents duplicate requests
 */
@Injectable()
export class PerformanceInterceptor implements HttpInterceptor {
  
  private requestTimings = new Map<string, number>();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = performance.now();
    const requestId = `${req.method}-${req.url}`;
    
    // Evita richieste duplicate
    if (this.requestTimings.has(requestId)) {
      const lastRequest = this.requestTimings.get(requestId)!;
      if (performance.now() - lastRequest < 1000) { // 1 secondo
        console.warn('Duplicate request prevented:', req.url);
        return next.handle(req);
      }
    }
    
    this.requestTimings.set(requestId, startTime);
    
    // Aggiungi headers per performance
    const optimizedReq = req.clone({
      setHeaders: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

    return next.handle(optimizedReq).pipe(
      tap({
        next: () => {
          const duration = performance.now() - startTime;
          if (duration > 1000) { // Log solo richieste lente
            console.warn(`Slow request: ${req.url} took ${duration.toFixed(2)}ms`);
          }
        },
        error: () => {
          const duration = performance.now() - startTime;
          console.error(`Failed request: ${req.url} after ${duration.toFixed(2)}ms`);
        },
        finalize: () => {
          this.requestTimings.delete(requestId);
        }
      })
    );
  }
}
