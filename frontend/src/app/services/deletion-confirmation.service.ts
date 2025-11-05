import { Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';

/**
 * Gestisce lo stato di conferma cancellazione per le card
 * con pattern di conferma visivo (X → ↩)
 * 
 * COMPORTAMENTO:
 * 1. Primo click su X → Mostra overlay conferma + esegue DELETE dopo delay
 * 2. Click su ↩ (annulla) → Cancella DELETE + chiama RESTORE se disponibile
 */
@Injectable()
export class DeletionConfirmationService {
  private deleting = signal(false);
  private deleteSubscription: Subscription | null = null;
  private destroyRef?: DestroyRef;
  private deleteDelay = 0; // Delay in ms prima di eseguire DELETE (0 = immediato)
  private deleteCompleted = false; // Flag per tracciare se DELETE è completata

  // Stato pubblico di lettura
  readonly isDeleting = computed(() => this.deleting());
  readonly deletingClass = computed(() => this.deleting() ? 'is-deleting' : '');

  /**
   * Inizializza il service con DestroyRef per cleanup automatico
   * 
   * @param destroyRef DestroyRef per cleanup
   * @param deleteDelay Millisecondi di delay prima di eseguire DELETE (default: 0)
   */
  initialize(destroyRef: DestroyRef, deleteDelay: number = 0): void {
    this.destroyRef = destroyRef;
    this.deleteDelay = deleteDelay;
  }

  /**
   * Gestisce il click sul bottone admin (X o ↩)
   * 
   * @param id ID dell'elemento da cancellare
   * @param deleteApi$ Observable per la chiamata DELETE
   * @param restoreApi$ Observable per la chiamata RESTORE (opzionale)
   * @param onDeleted Callback quando cancellazione completata
   * @param onError Callback in caso di errore
   * @param onRestored Callback quando restore completato
   */
  handleAdminClick<T>(
    id: number,
    deleteApi$: Observable<any>,
    restoreApi$: Observable<T> | null,
    onDeleted: (id: number) => void,
    onError: (error: any) => void,
    onRestored?: (restored: T) => void
  ): void {
    // Se già in stato di conferma, annulla
    if (this.deleting()) {
      this.cancel(id, restoreApi$, onRestored);
      return;
    }

    // Attiva stato di conferma visiva
    this.deleting.set(true);
    this.deleteCompleted = false; // Reset flag

    // Esegui la chiamata DELETE con delay opzionale
    const apiCall$ = this.deleteDelay > 0 
      ? deleteApi$.pipe(delay(this.deleteDelay))
      : deleteApi$;

    this.deleteSubscription = apiCall$.subscribe({
      next: () => {
        this.deleteCompleted = true; // Marca DELETE come completata
        this.cleanup();
        onDeleted(id);
      },
      error: (err) => {
        this.deleteCompleted = false; // DELETE fallita
        this.cleanup();
        onError(err);
      }
    });
  }

  /**
   * Annulla la cancellazione
   * 
   * LOGICA:
   * 1. Se DELETE ancora in corso → Annulla la subscription
   * 2. Se DELETE già completata → Chiama RESTORE per ripristinare
   */
  private cancel<T>(
    id: number,
    restoreApi$: Observable<T> | null,
    onRestored?: (restored: T) => void
  ): void {
    // CASO 1: DELETE ancora in corso → Annulla la chiamata
    if (this.deleteSubscription && !this.deleteCompleted) {
      console.log(`[DeletionService] Annullamento DELETE in corso per ID ${id}`);
      this.deleteSubscription.unsubscribe();
      this.deleteSubscription = null;
      this.deleting.set(false);
      this.deleteCompleted = false;
      return; // Esce senza chiamare RESTORE
    }

    // CASO 2: DELETE già completata → Chiama RESTORE
    if (this.deleteCompleted && restoreApi$ && this.destroyRef) {
      console.log(`[DeletionService] DELETE completata, chiamo RESTORE per ID ${id}`);
      
      // Reset stato UI immediatamente per UX reattiva
      this.deleting.set(false);
      this.deleteCompleted = false;
      
      // Chiama RESTORE in background
      restoreApi$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (restored) => {
            console.log(`[DeletionService] RESTORE completato per ID ${id}`);
            onRestored?.(restored);
          },
          error: (err) => {
            console.error(`[DeletionService] Errore durante RESTORE per ID ${id}:`, err);
          }
        });
    } else {
      // Fallback: reset stato
      this.deleting.set(false);
      this.deleteCompleted = false;
    }
  }

  /**
   * Reset dello stato completo (include deleteCompleted)
   */
  reset(): void {
    if (this.deleteSubscription) {
      this.deleteSubscription.unsubscribe();
    }
    this.deleteSubscription = null;
    this.deleting.set(false);
    this.deleteCompleted = false;
  }

  /**
   * Cleanup interno dopo DELETE completata
   */
  private cleanup(): void {
    this.deleteSubscription = null;
    this.deleting.set(false);
    // Non resetto deleteCompleted qui perché serve per decidere se fare RESTORE
  }

  /**
   * Previene azioni durante la cancellazione
   */
  shouldPreventAction(): boolean {
    return this.deleting();
  }
}

