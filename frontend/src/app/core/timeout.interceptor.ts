import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';

/**
 * Timeout Interceptor
 * 
 * Adds a simple timeout to all HTTP requests to prevent hanging requests.
 */
@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Timeout di 10 secondi per tutte le richieste
    return next.handle(req).pipe(
      timeout(10000)
    );
  }
}
