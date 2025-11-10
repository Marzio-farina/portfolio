import { Injectable } from '@angular/core';
import {
  HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable, catchError, retryWhen, switchMap, throwError, timer, timeout } from 'rxjs';
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
    
    // Timeout differenziato per tipo di richiesta
    // GitHub API: timeout più lungo (può essere lento)
    // Altre API: timeout standard
    const isGitHubApi = clone.url.includes('/github/');
    const requestTimeout = isGitHubApi 
      ? 60000 // 60s per GitHub API (può essere lenta)
      : (environment.production ? 5000 : 10000); // 10s in locale, 5s in produzione

    return next.handle(clone).pipe(
      timeout(requestTimeout),
      // Retry solo per errori non 4xx
      retryWhen(errors => {
        let retryCount = 0;
        const maxRetries = isGet ? 1 : 0;
        
        return errors.pipe(
          switchMap((err: unknown) => {
            const status = (err as HttpErrorResponse)?.status;
            // Non riprovare per errori client (4xx) - passa direttamente
            if (status >= 400 && status < 500) {
              return throwError(() => err);
            }
            // Riprova solo se non abbiamo raggiunto il limite
            if (retryCount < maxRetries) {
              retryCount++;
              return timer(200 * retryCount);
            }
            // Limite raggiunto - passa l'errore
            return throwError(() => err);
          })
        );
      }),
      catchError((err: unknown) => {
        if (isAbort(err)) {
          return throwError(() => err);
        }
        return throwError(() => err);
      })
    );
  }
}