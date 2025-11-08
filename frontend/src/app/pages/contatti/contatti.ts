import { Component, inject, signal, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Maps } from '../../components/maps/maps';
import { ContactForm } from '../../components/contact-form/contact-form';
import { Notification, NotificationType } from '../../components/notification/notification';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  fieldId: string;
}

@Component({
  selector: 'app-contatti',
  imports: [
    Maps,
    ContactForm,
    Notification
  ],
  templateUrl: './contatti.html',
  styleUrl: './contatti.css'
})
export class Contatti implements OnDestroy {
  private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  
  // Gestione notifiche multiple
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = false;
  private readonly successAutoDismissDelay = 4000;
  private successRemovalTimers = new Map<string, number>();

  onErrorChange(errorData: {message: string, type: NotificationType, fieldId: string, action: 'add' | 'remove'} | undefined) {
    if (!errorData) {
      return;
    }

    if (errorData.action === 'add') {
      const currentNotifications = this.notifications();
      const now = Date.now();

      const refreshedNotification: NotificationItem = {
        id: `${errorData.fieldId}-${now}`,
        message: errorData.message,
        type: errorData.type,
        timestamp: now,
        fieldId: errorData.fieldId
      };

      const filteredNotifications = currentNotifications.filter(n => n.fieldId !== errorData.fieldId);

      this.notifications.set([...filteredNotifications, refreshedNotification]);
      this.showMultipleNotifications = true;
      if (errorData.type === 'success') {
        this.scheduleSuccessRemoval(errorData.fieldId);
      } else {
        this.clearSuccessRemovalTimer(errorData.fieldId);
      }
      return;
    }

    if (errorData.action === 'remove') {
      const currentNotifications = this.notifications();
      const filteredNotifications = currentNotifications.filter(n => n.fieldId !== errorData.fieldId);
      this.notifications.set(filteredNotifications);
      this.clearSuccessRemovalTimer(errorData.fieldId);
    }
  }

  onSuccessChange(success: string | undefined) {
    if (success) {
      const currentNotifications = this.notifications();
      
      // Controlla se esiste già una notifica di successo con lo stesso messaggio
      const duplicateSuccess = currentNotifications.some(n => n.message === success && n.type === 'success');
      
      if (!duplicateSuccess) {
        // Crea una notifica di successo solo se non esiste già una con lo stesso messaggio
        const successNotification: NotificationItem = {
          id: `success-${Date.now()}`,
          message: success,
          type: 'success',
          timestamp: Date.now(),
          fieldId: 'success'
        };
        
        // Aggiungi alla lista delle notifiche
        this.notifications.set([...currentNotifications, successNotification]);
        this.showMultipleNotifications = true;
        this.scheduleSuccessRemoval(successNotification.fieldId);
      }
    }
  }

  // Metodo per ottenere l'errore più grave per l'icona nell'angolo
  getMostSevereNotification(): NotificationItem | null {
    const currentNotifications = this.notifications();
    if (currentNotifications.length === 0) return null;
    
    // Scala di gravità: Error > Warning > Info > Success
    const severityOrder = { 'error': 0, 'warning': 1, 'info': 2, 'success': 3 };
    
    return currentNotifications.reduce((mostSevere, current) => {
      if (severityOrder[current.type] < severityOrder[mostSevere.type]) {
        return current;
      }
      return mostSevere;
    });
  }

  ngOnDestroy(): void {
    this.clearAllSuccessRemovalTimers();
  }

  private scheduleSuccessRemoval(fieldId: string, delay = this.successAutoDismissDelay): void {
    const existingTimer = this.successRemovalTimers.get(fieldId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      const updated = this.notifications().filter(n => !(n.fieldId === fieldId && n.type === 'success'));
      this.notifications.set(updated);
      this.showMultipleNotifications = updated.length > 0;
      this.successRemovalTimers.delete(fieldId);
    }, delay);

    this.successRemovalTimers.set(fieldId, timer);
  }

  private clearSuccessRemovalTimer(fieldId: string): void {
    const timer = this.successRemovalTimers.get(fieldId);
    if (timer) {
      clearTimeout(timer);
      this.successRemovalTimers.delete(fieldId);
    }
  }

  private clearAllSuccessRemovalTimers(): void {
    this.successRemovalTimers.forEach(timer => clearTimeout(timer));
    this.successRemovalTimers.clear();
  }
}