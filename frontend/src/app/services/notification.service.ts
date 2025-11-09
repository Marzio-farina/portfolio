import { Injectable, signal, OnDestroy, computed } from '@angular/core';
import { NotificationItem, NotificationType } from '../components/notification/notification';

/**
 * Servizio centralizzato per la gestione delle notifiche
 * Elimina la duplicazione di codice tra i vari componenti
 * 
 * USO:
 * - Per notifiche isolate per componente: fornisci il servizio a livello di componente
 *   providers: [NotificationService] nel decorator @Component
 * 
 * - Per notifiche globali: usa il servizio root (default)
 *   inject(NotificationService) senza providers
 */
@Injectable({
  providedIn: 'root' // Può essere sovrascritto a livello di componente per istanze isolate
})
export class NotificationService implements OnDestroy {
  // Stato delle notifiche
  private readonly _notifications = signal<NotificationItem[]>([]);
  
  // Computed per mostrare le notifiche multiple
  readonly showMultiple = computed(() => this._notifications().length > 0);
  
  // Delay per auto-dismiss delle notifiche di successo (default 4 secondi)
  private readonly successAutoDismissDelay = 4000;
  private successRemovalTimers = new Map<string, number>();

  /**
   * Signal pubblico per accedere alle notifiche
   */
  readonly notifications = this._notifications.asReadonly();

  /**
   * Aggiunge una notifica alla lista
   * Se esiste già una notifica con lo stesso fieldId, viene sostituita
   * 
   * @param type Tipo di notifica
   * @param message Messaggio della notifica
   * @param fieldId Identificatore univoco del campo/azione
   * @param autoDismiss Se true, le notifiche di successo vengono rimosse automaticamente dopo il delay
   * @param persistent Se true, la notifica non collassa mai in un'icona
   */
  add(type: NotificationType, message: string, fieldId: string, autoDismiss: boolean = true, persistent: boolean = false): void {
    const now = Date.now();
    
    // Genera ID univoco
    const hasTimestamp = /-\d+$/.test(fieldId);
    const id = hasTimestamp 
      ? `${fieldId}-${now}-${Math.random().toString(36).substr(2, 9)}`
      : `${fieldId}-${now}`;
    
    const newNotification: NotificationItem = {
      id,
      message,
      type,
      timestamp: now,
      fieldId,
      persistent
    };
    
    // Rimuovi notifiche precedenti con lo stesso fieldId (se non ha timestamp)
    const currentNotifications = this._notifications();
    const filteredNotifications = hasTimestamp
      ? currentNotifications
      : currentNotifications.filter(n => n.fieldId !== fieldId);
    
    // Aggiungi la nuova notifica
    this._notifications.set([...filteredNotifications, newNotification]);
    
    // Gestisci auto-dismiss per success
    if (type === 'success' && autoDismiss) {
      this.scheduleSuccessRemoval(fieldId);
    } else {
      this.clearSuccessRemovalTimer(fieldId);
    }
  }

  /**
   * Rimuove una notifica per fieldId
   */
  remove(fieldId: string): void {
    const currentNotifications = this._notifications();
    const filteredNotifications = currentNotifications.filter(n => n.fieldId !== fieldId);
    this._notifications.set(filteredNotifications);
    this.clearSuccessRemovalTimer(fieldId);
  }

  /**
   * Rimuove una notifica per ID
   */
  removeById(id: string): void {
    const currentNotifications = this._notifications();
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this._notifications.set(filteredNotifications);
  }

  /**
   * Rimuove tutte le notifiche
   */
  clear(): void {
    this._notifications.set([]);
    this.clearAllSuccessRemovalTimers();
  }

  /**
   * Gestisce l'aggiunta/rimozione di notifiche tramite oggetto di configurazione
   * Utile per integrazione con componenti form che emettono errorChange
   */
  handleErrorChange(errorData: {message: string, type: NotificationType, fieldId: string, action: 'add' | 'remove'} | undefined): void {
    if (!errorData) {
      return;
    }

    if (errorData.action === 'add') {
      this.add(errorData.type, errorData.message, errorData.fieldId);
    } else if (errorData.action === 'remove') {
      this.remove(errorData.fieldId);
    }
  }

  /**
   * Aggiunge una notifica di successo
   * Evita duplicati con lo stesso messaggio
   */
  addSuccess(message: string, autoDismiss: boolean = true, persistent: boolean = false): void {
    const currentNotifications = this._notifications();
    
    // Controlla se esiste già una notifica di successo con lo stesso messaggio
    const duplicateSuccess = currentNotifications.some(n => n.message === message && n.type === 'success');
    
    if (!duplicateSuccess) {
      this.add('success', message, 'success', autoDismiss, persistent);
    }
  }

  /**
   * Ottiene la notifica più grave per l'icona nell'angolo
   * Scala di gravità: Error > Warning > Info > Success
   */
  getMostSevere(): NotificationItem | null {
    const currentNotifications = this._notifications();
    if (currentNotifications.length === 0) return null;
    
    const severityOrder: Record<NotificationType, number> = { 
      'error': 0, 
      'warning': 1, 
      'info': 2, 
      'success': 3 
    };
    
    return currentNotifications.reduce((mostSevere, current) => {
      if (severityOrder[current.type] < severityOrder[mostSevere.type]) {
        return current;
      }
      return mostSevere;
    });
  }

  /**
   * Programma la rimozione automatica di una notifica di successo
   */
  private scheduleSuccessRemoval(fieldId: string, delay: number = this.successAutoDismissDelay): void {
    const existingTimer = this.successRemovalTimers.get(fieldId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      const updated = this._notifications().filter(n => !(n.fieldId === fieldId && n.type === 'success'));
      this._notifications.set(updated);
      this.successRemovalTimers.delete(fieldId);
    }, delay);

    this.successRemovalTimers.set(fieldId, timer);
  }

  /**
   * Cancella il timer di rimozione per un fieldId
   */
  private clearSuccessRemovalTimer(fieldId: string): void {
    const timer = this.successRemovalTimers.get(fieldId);
    if (timer) {
      clearTimeout(timer);
      this.successRemovalTimers.delete(fieldId);
    }
  }

  /**
   * Cancella tutti i timer di rimozione
   */
  private clearAllSuccessRemovalTimers(): void {
    this.successRemovalTimers.forEach(timer => clearTimeout(timer));
    this.successRemovalTimers.clear();
  }

  ngOnDestroy(): void {
    this.clearAllSuccessRemovalTimers();
  }
}

