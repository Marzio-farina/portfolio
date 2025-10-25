import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable, catchError, retry, throwError, timer, timeout, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const API_BASE = '';

function isAbort(err: unknown): boolean {
  return !!err && (
    (err as any).name === 'CanceledError' ||
    (err as any).status === 0 ||
    (err as any).message === 'Http failure response for (unknown url): 0 Unknown Error'
  );
}

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = API_BASE && !/^https?:\/\//.test(req.url) ? API_BASE + req.url : req.url;
    const clone = req.clone({
      url,
      withCredentials: false,
      setHeaders: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const isGet = clone.method === 'GET';
    
    // Timeout più lungo in locale per sviluppo
    const requestTimeout = environment.production ? 5000 : 30000; // 30s in locale, 5s in produzione

    return next.handle(clone).pipe(
      // Log timing in localhost
      tap(() => {
        if (!environment.production) {
          console.log(`[API] ${clone.method} ${clone.url}`);
        }
      }),
      timeout(requestTimeout),
      retry({
        count: isGet ? 1 : 0,
        delay: (_, i) => timer(200 * (i + 1)),
        resetOnSuccess: true
      }),
      catchError((err: unknown) => {
        if (isAbort(err)) {
          // Silenzia aborts; in prod non loggare
          if (!environment.production) {
            console.warn('[API] Request aborted', clone.url);
          }
          return throwError(() => err);
        }
        if (!environment.production) {
          console.error('[API] Request failed', clone.url, err);
        }
        return throwError(() => err);
      })
    );
  }
}