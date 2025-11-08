import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Global Error Handler
 * 
 * Gestisce tutti gli errori non catturati nell'applicazione Angular
 * con logging strutturato e gestione intelligente degli errori critici
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private router = inject(Router);
  
  handleError(error: Error | HttpErrorResponse | any): void {
    // Filtra errori innocui causati da Angular change detection
    if (this.shouldIgnoreError(error)) {
      return; // Ignora silenziosamente
    }
    
    // Determina il tipo di errore
    const isHttpError = error instanceof HttpErrorResponse;
    const isChunkLoadError = error?.name === 'ChunkLoadError';
    
    // Crea oggetto di log strutturato
    const errorDetails = {
      timestamp: new Date().toISOString(),
      type: this.getErrorType(error),
      message: error?.message || 'Errore sconosciuto',
      status: isHttpError ? error.status : null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      stack: error?.stack || null,
    };
    
    // Log in console (sempre visibile)
    console.error('🔥 Global Error:', errorDetails);
    
    // Gestione errori critici
    if (this.isCriticalError(error)) {
      this.handleCriticalError(error, errorDetails);
      return;
    }
    
    // Gestione errori HTTP
    if (isHttpError) {
      this.handleHttpError(error);
      return;
    }
    
    // Gestione errori JavaScript
    this.handleJavaScriptError(error);
  }
  
  /**
   * Filtra errori innocui che non devono essere loggati
   */
  private shouldIgnoreError(error: any): boolean {
    const errorMessage = error?.message || '';
    
    // Errori Angular change detection innocui
    if (errorMessage.includes('An ErrorEvent with no error occurred')) {
      return true;
    }
    
    // Errori notificazioni non consegnate (innocui)
    if (errorMessage.includes('undelivered notifications')) {
      return true;
    }
    
    // Errori Three.js multiple instances (warning innocuo)
    if (errorMessage.includes('Multiple instances of Three.js')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Determina se è un errore critico che richiede azione immediata
   */
  private isCriticalError(error: any): boolean {
    return (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Cannot read properties of undefined') ||
      error?.message?.includes('Cannot read property') ||
      error?.message?.includes('is not a function') ||
      error?.status === 0 // Network completamente down
    );
  }
  
  /**
   * Gestisce errori critici
   */
  private handleCriticalError(error: any, details: any): void {
    console.error('❌ Critical Error:', details);
    
    // ChunkLoadError: ricarica la pagina (nuova versione deploy)
    if (error?.name === 'ChunkLoadError') {
      if (confirm('È disponibile una nuova versione. Ricaricare la pagina?')) {
        window.location.reload();
      }
      return;
    }
    
    // Altri errori critici: mostra messaggio user-friendly
    // (opzionale: redirect a pagina errore)
    // this.router.navigate(['/error'], { 
    //   queryParams: { message: 'Si è verificato un errore critico' } 
    // });
  }
  
  /**
   * Gestisce errori HTTP
   */
  private handleHttpError(error: HttpErrorResponse): void {
    console.warn('🌐 HTTP Error:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
    });
    
    // Errori di autenticazione: redirect a login
    if (error.status === 401) {
      // Gestito dall'AuthInterceptor, ma log qui per completezza
      console.warn('Errore autenticazione - redirect a login');
    }
    
    // Errori di autorizzazione
    if (error.status === 403) {
      console.warn('Accesso negato');
    }
    
    // Errori del server
    if (error.status >= 500) {
      console.error('Errore del server:', error.status);
    }
  }
  
  /**
   * Gestisce errori JavaScript
   */
  private handleJavaScriptError(error: Error): void {
    console.error('⚠️ JavaScript Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }
  
  /**
   * Ottieni tipo di errore per logging
   */
  private getErrorType(error: any): string {
    if (error instanceof HttpErrorResponse) {
      return 'HTTP_ERROR';
    }
    if (error?.name === 'ChunkLoadError') {
      return 'CHUNK_LOAD_ERROR';
    }
    if (error instanceof TypeError) {
      return 'TYPE_ERROR';
    }
    if (error instanceof ReferenceError) {
      return 'REFERENCE_ERROR';
    }
    if (error instanceof Error) {
      return error.name || 'JAVASCRIPT_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }
}

