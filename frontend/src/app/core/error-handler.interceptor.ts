import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Error Handler Interceptor
 * 
 * Handles HTTP errors globally and provides retry logic
 * for failed requests with exponential backoff.
 */
@Injectable()
export class ErrorHandlerInterceptor implements HttpInterceptor {
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      retry({
        count: 1,
        delay: (error, retryCount) => {
          if (!environment.production) {
            console.warn(`Retry ${retryCount} for ${req.url}`, error);
          }
          return new Promise(resolve => setTimeout(resolve, 500));
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (!environment.production) {
          console.error('HTTP Error Details:', {
            url: req.url,
            method: req.method,
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            headers: error.headers,
            timestamp: new Date().toISOString()
          });
        }
        let errorMessage = 'Errore di rete';
        if (error.status === 0) {
          errorMessage = 'Connessione fallita. Verifica la connessione internet.';
        } else if (error.status === 404) {
          errorMessage = 'Risorsa non trovata';
        } else if (error.status === 500) {
          errorMessage = 'Errore del server (500). Riprova più tardi.';
        } else if (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout')) {
          errorMessage = 'Timeout della richiesta. Riprova.';
        } else if (error.status >= 400 && error.status < 500) {
          errorMessage = `Errore client (${error.status}).`;
        } else if (error.status >= 500) {
          errorMessage = `Errore server (${error.status}).`;
        }
        const customError = new Error(errorMessage) as any;
        customError.originalError = error; // HttpErrorResponse completo
        customError.status = error.status;
        customError.payload = error.error; // body JSON del server (es. { message, errors })
        return throwError(() => customError);
      })
    );
  }
}
