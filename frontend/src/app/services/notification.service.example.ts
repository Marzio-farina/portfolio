/**
 * ESEMPIO DI UTILIZZO DEL NotificationService
 * 
 * Questo file mostra come usare il servizio centralizzato invece di duplicare la logica
 * in ogni componente.
 */

import { Component, inject } from '@angular/core';
import { NotificationService } from './notification.service';
import { Notification } from '../components/notification/notification';

/**
 * ESEMPIO 1: Notifiche isolate per componente
 * Ogni componente ha la propria istanza del servizio
 */
@Component({
  selector: 'app-example-isolated',
  imports: [Notification],
  providers: [NotificationService], // Istanza isolata per questo componente
  template: `
    <app-notification
      [notifications]="notificationService.notifications()"
      [showMultiple]="notificationService.showMultiple()"
      [mostSevereNotification]="notificationService.getMostSevere()"
    />
  `
})
export class ExampleIsolatedComponent {
  // Inietta il servizio invece di gestire lo stato localmente
  protected notificationService = inject(NotificationService);

  // ESEMPIO 1: Aggiungere una notifica semplice
  showError() {
    this.notificationService.add('error', 'Si è verificato un errore', 'error-field');
  }

  // ESEMPIO 2: Aggiungere notifica di successo con auto-dismiss
  showSuccess() {
    this.notificationService.addSuccess('Operazione completata con successo!');
  }

  // ESEMPIO 3: Gestire errori da form (come onErrorChange)
  onFormError(errorData: {message: string, type: 'error' | 'warning' | 'info' | 'success', fieldId: string, action: 'add' | 'remove'} | undefined) {
    this.notificationService.handleErrorChange(errorData);
  }

  // ESEMPIO 4: Rimuovere una notifica specifica
  clearFieldError(fieldId: string) {
    this.notificationService.remove(fieldId);
  }

  // ESEMPIO 5: Pulire tutte le notifiche
  clearAll() {
    this.notificationService.clear();
  }
}

/**
 * ESEMPIO 2: Notifiche globali condivise
 * Tutti i componenti condividono la stessa istanza
 */
@Component({
  selector: 'app-example-global',
  imports: [Notification],
  // NON specificare providers - usa l'istanza root
  template: `
    <app-notification
      [notifications]="notificationService.notifications()"
      [showMultiple]="notificationService.showMultiple()"
      [mostSevereNotification]="notificationService.getMostSevere()"
    />
  `
})
export class ExampleGlobalComponent {
  protected notificationService = inject(NotificationService);
  
  showGlobalError() {
    // Questa notifica sarà visibile a tutti i componenti che usano l'istanza root
    this.notificationService.add('error', 'Errore globale', 'global-error');
  }
}

/**
 * CONFRONTO PRIMA/DOPO:
 * 
 * PRIMA (codice duplicato in ogni componente):
 * ```typescript
 * export class MyComponent {
 *   notifications = signal<NotificationItem[]>([]);
 *   showMultipleNotifications = false;
 *   private successRemovalTimers = new Map<string, number>();
 * 
 *   private addNotification(type: NotificationType, message: string, fieldId: string): void {
 *     const now = Date.now();
 *     const newNotification: NotificationItem = {
 *       id: `${fieldId}-${now}`,
 *       message: message,
 *       type: type,
 *       timestamp: now,
 *       fieldId: fieldId
 *     };
 *     const filteredNotifications = this.notifications().filter(n => n.fieldId !== fieldId);
 *     this.notifications.set([...filteredNotifications, newNotification]);
 *     this.showMultipleNotifications = true;
 *     // ... gestione auto-dismiss ...
 *   }
 * 
 *   getMostSevereNotification(): NotificationItem | null {
 *     // ... logica duplicata ...
 *   }
 * }
 * ```
 * 
 * DOPO (usando il servizio):
 * ```typescript
 * export class MyComponent {
 *   protected notificationService = inject(NotificationService);
 * 
 *   showError() {
 *     this.notificationService.add('error', 'Messaggio', 'field-id');
 *   }
 * }
 * ```
 * 
 * VANTAGGI:
 * - Nessuna duplicazione di codice
 * - Logica centralizzata e testabile
 * - Facile da mantenere e aggiornare
 * - Comportamento consistente in tutta l'applicazione
 */

