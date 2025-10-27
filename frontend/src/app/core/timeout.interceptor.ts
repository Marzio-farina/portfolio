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
    // Evita doppio timeout: lasciamo gestire il timeout principale all'ApiInterceptor.
    // Per sicurezza, applichiamo un timeout molto ampio solo come guardrail,
    // e disabilitiamo su endpoint sensibili come /api/contact.
    const isContact = /\/contact(\?|$)/.test(req.url);
    if (isContact) {
      return next.handle(req); // nessun timeout aggiuntivo sul form contatti
    }
    return next.handle(req).pipe(timeout(60000)); // 60s guardrail
  }
}
