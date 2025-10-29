import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servizio per gestire lo stato della modal di upload CV
 * Permette di aprire/chiudere la modal da qualsiasi componente
 */
@Injectable({ providedIn: 'root' })
export class CvUploadModalService {
  /** Signal che indica se la modal è aperta */
  isOpen = signal(false);

  /** Subject per emettere eventi quando l'upload è completato */
  private readonly uploadCompleted$ = new Subject<void>();

  /**
   * Observable che emette quando l'upload CV è completato
   */
  get onUploadCompleted$() {
    return this.uploadCompleted$.asObservable();
  }

  /**
   * Apre la modal di upload CV
   */
  open(): void {
    this.isOpen.set(true);
  }

  /**
   * Chiude la modal di upload CV
   */
  close(): void {
    this.isOpen.set(false);
  }

  /**
   * Notifica che l'upload è stato completato
   * Chiamato dall'App component quando la modal emette l'evento uploaded
   */
  notifyUploadCompleted(): void {
    this.uploadCompleted$.next();
  }
}

