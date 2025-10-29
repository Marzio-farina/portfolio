import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface AttestatoError {
  message: string;
  type: 'error' | 'warning';
}

/**
 * Servizio per gestire lo stato della modal di aggiunta attestato
 * Permette di aprire/chiudere la modal da qualsiasi componente
 */
@Injectable({ providedIn: 'root' })
export class AddAttestatoModalService {
  /** Signal che indica se la modal è aperta */
  isOpen = signal(false);

  /** Subject per emettere eventi quando l'attestato è creato */
  private readonly attestatoCreated$ = new Subject<void>();

  /** Subject per emettere errori quando si verifica un problema */
  private readonly attestatoError$ = new Subject<AttestatoError>();

  /**
   * Observable che emette quando un attestato è stato creato
   */
  get onAttestatoCreated$() {
    return this.attestatoCreated$.asObservable();
  }

  /**
   * Observable che emette quando si verifica un errore durante la creazione dell'attestato
   */
  get onAttestatoError$() {
    return this.attestatoError$.asObservable();
  }

  /**
   * Apre la modal di aggiunta attestato
   */
  open(): void {
    this.isOpen.set(true);
  }

  /**
   * Chiude la modal di aggiunta attestato
   */
  close(): void {
    this.isOpen.set(false);
  }

  /**
   * Notifica che un attestato è stato creato
   * Chiamato dall'App component quando la modal emette l'evento created
   */
  notifyAttestatoCreated(): void {
    this.attestatoCreated$.next();
  }

  /**
   * Notifica che si è verificato un errore durante la creazione dell'attestato
   * Chiamato dall'App component quando la modal emette l'evento errorOccurred
   */
  notifyAttestatoError(error: AttestatoError): void {
    this.attestatoError$.next(error);
  }
}

