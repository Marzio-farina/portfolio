import { Injectable, inject } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, retry, throwError, timer } from 'rxjs';

// Se hai già apiUrl(), puoi anche non prependere qui.
// In alternativa leggi da environment.API_BASE_URL.
const API_BASE = ''; // lascialo vuoto se usi apiUrl() nei service

function isAbort(err: unknown): boolean {
  // diversi browser librerie segnalano abort in modo diverso
  return !!err && (
    (err as any).name === 'CanceledError' ||
    (err as any).status === 0 ||
    (err as any).message === 'Http failure response for (unknown url): 0 Unknown Error'
  );
}

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // opzionale: prepend base API se la URL è relativa
    const url = API_BASE && !/^https?:\/\//.test(req.url) ? API_BASE + req.url : req.url;
    const clone = req.clone({
      url,
      // no credentials sulle GET pubbliche
      withCredentials: false,
      setHeaders: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const isIdempotentGet = clone.method === 'GET';

    return next.handle(clone).pipe(
      // piccolo retry SOLO per GET e SOLO su errori transitori != abort/CORS
      retry({
        count: 1,
        delay: (_, i) => timer(200 * (i + 1)),
        resetOnSuccess: true
      }),
      catchError((err: unknown) => {
        if (isAbort(err)) {
          // Silenzia gli abort (navigazione, reload, etc.)
          return throwError(() => err);
        }
        // Altri errori li propaghiamo
        return throwError(() => err);
      })
    );
  }
}