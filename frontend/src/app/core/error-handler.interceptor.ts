import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';

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
        count: 1, // 1 retry per robustezza
        delay: (error, retryCount) => {
          console.warn(`Retry ${retryCount} for ${req.url}`, error);
          return new Promise(resolve => setTimeout(resolve, 1000));
        }
      }),
      catchError((error: HttpErrorResponse) => {
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
        
        // Personalizza il messaggio di errore
        let errorMessage = 'Errore di rete';
        
        if (error.status === 0) {
          errorMessage = 'Connessione fallita. Verifica la connessione internet.';
        } else if (error.status === 404) {
          errorMessage = 'Risorsa non trovata';
        } else if (error.status === 500) {
          errorMessage = 'Errore del server (500). Controlla i log del backend.';
        } else if (error.status === 503) {
          errorMessage = 'Servizio temporaneamente non disponibile';
        } else if (error.name === 'TimeoutError' || error.message?.includes('Timeout')) {
          errorMessage = 'Timeout della richiesta (10s). Riprova.';
        } else if (error.status >= 400 && error.status < 500) {
          errorMessage = `Errore client (${error.status}). Verifica la richiesta.`;
        } else if (error.status >= 500) {
          errorMessage = `Errore server (${error.status}). Riprova più tardi.`;
        }
        
        // Crea un errore personalizzato
        const customError = new Error(errorMessage);
        (customError as any).originalError = error;
        (customError as any).status = error.status;
        
        return throwError(() => customError);
      })
    );
  }
}
