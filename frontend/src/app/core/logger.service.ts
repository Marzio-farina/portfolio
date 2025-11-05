import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Logger Service
 * 
 * Servizio centralizzato per logging strutturato nel frontend
 * con livelli di log e context automatico
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private isDev = !environment.production;
  
  /**
   * Log informativo
   */
  log(message: string, data?: any): void {
    if (this.isDev) {
      console.log(
        `[INFO] ${this.getTimestamp()} ${message}`, 
        data ? this.formatData(data) : ''
      );
    }
  }
  
  /**
   * Log di warning
   */
  warn(message: string, data?: any): void {
    console.warn(
      `[WARN] ${this.getTimestamp()} ${message}`,
      data ? this.formatData(data) : ''
    );
  }
  
  /**
   * Log di errore
   */
  error(message: string, error?: any, context?: any): void {
    const errorDetails = this.buildErrorDetails(message, error, context);
    
    console.error(
      `[ERROR] ${this.getTimestamp()} ${message}`,
      errorDetails
    );
    
    // In produzione: invia errori a servizio esterno (opzionale)
    if (!this.isDev) {
      this.sendToRemoteLogger(errorDetails);
    }
  }
  
  /**
   * Log di debug (solo in development)
   */
  debug(message: string, data?: any): void {
    if (this.isDev) {
      console.debug(
        `[DEBUG] ${this.getTimestamp()} ${message}`,
        data ? this.formatData(data) : ''
      );
    }
  }
  
  /**
   * Log di performance
   */
  performance(operation: string, duration: number, context?: any): void {
    const level = duration > 1000 ? 'WARN' : 'INFO';
    const message = `Performance: ${operation} took ${duration.toFixed(2)}ms`;
    
    if (this.isDev || duration > 1000) {
      console[level === 'WARN' ? 'warn' : 'log'](
        `[${level}] ${this.getTimestamp()} ${message}`,
        context ? this.formatData(context) : ''
      );
    }
  }
  
  /**
   * Log di evento di sicurezza
   */
  security(event: string, context?: any): void {
    console.warn(
      `[SECURITY] ${this.getTimestamp()} ${event}`,
      context ? this.formatData(context) : ''
    );
    
    // Invia sempre eventi di sicurezza al backend
    this.sendSecurityEvent(event, context);
  }
  
  /**
   * Log di azione utente (analytics)
   */
  userAction(action: string, data?: any): void {
    if (this.isDev) {
      console.log(
        `[USER_ACTION] ${this.getTimestamp()} ${action}`,
        data ? this.formatData(data) : ''
      );
    }
    
    // Invia analytics (opzionale)
    // this.sendAnalytics(action, data);
  }
  
  /**
   * Ottieni timestamp formattato
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }
  
  /**
   * Formatta i dati per il log
   */
  private formatData(data: any): any {
    if (!data) return '';
    
    return {
      ...data,
      url: window.location.href,
      timestamp: this.getTimestamp(),
    };
  }
  
  /**
   * Costruisci dettagli errore strutturati
   */
  private buildErrorDetails(message: string, error?: any, context?: any): any {
    return {
      message,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
      context: context || {},
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: this.getTimestamp(),
        production: !this.isDev,
      },
    };
  }
  
  /**
   * Invia log a servizio remoto (placeholder)
   */
  private sendToRemoteLogger(errorDetails: any): void {
    // TODO: Implementare invio a servizio esterno (Sentry, LogRocket, etc.)
    // Esempio:
    // this.http.post('/api/client-errors', errorDetails).subscribe();
  }
  
  /**
   * Invia evento di sicurezza al backend
   */
  private sendSecurityEvent(event: string, context?: any): void {
    // TODO: Implementare invio eventi sicurezza al backend
    // Esempio:
    // this.http.post('/api/security-events', { event, context }).subscribe();
  }
  
  /**
   * Misura performance di un'operazione
   */
  measurePerformance<T>(
    operation: string, 
    fn: () => T | Promise<T>
  ): T | Promise<T> {
    const start = performance.now();
    
    try {
      const result = fn();
      
      // Se è una Promise, misura quando si risolve
      if (result instanceof Promise) {
        return result.then(value => {
          const duration = performance.now() - start;
          this.performance(operation, duration);
          return value;
        }).catch(error => {
          const duration = performance.now() - start;
          this.performance(operation, duration, { error: true });
          throw error;
        }) as T;
      }
      
      // Operazione sincrona
      const duration = performance.now() - start;
      this.performance(operation, duration);
      return result;
      
    } catch (error) {
      const duration = performance.now() - start;
      this.performance(operation, duration, { error: true });
      throw error;
    }
  }
  
  /**
   * Crea un timer per misurare durata operazioni
   */
  startTimer(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.performance(label, duration);
    };
  }
}

