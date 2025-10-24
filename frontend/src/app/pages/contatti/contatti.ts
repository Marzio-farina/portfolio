import { Component, inject, signal } from '@angular/core';
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
export class Contatti {
  private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  
  // Gestione notifiche multiple
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = false;

  onErrorChange(errorData: {message: string, type: NotificationType, fieldId: string, action: 'add' | 'remove'} | undefined) {
    if (errorData) {
      if (errorData.action === 'add') {
        const currentNotifications = this.notifications();
        
        // Controlla se esiste già una notifica con lo stesso messaggio
        const duplicateMessage = currentNotifications.some(n => n.message === errorData.message);
        
        if (!duplicateMessage) {
          // Aggiungi nuova notifica solo se non esiste già una con lo stesso messaggio
          const newNotification: NotificationItem = {
            id: `${errorData.fieldId}-${Date.now()}`,
            message: errorData.message,
            type: errorData.type,
            timestamp: Date.now(),
            fieldId: errorData.fieldId
          };
          
          // Rimuovi eventuali notifiche precedenti per lo stesso campo
          const filteredNotifications = currentNotifications.filter(n => n.fieldId !== errorData.fieldId);
          
          // Aggiungi la nuova notifica
          this.notifications.set([...filteredNotifications, newNotification]);
          this.showMultipleNotifications = true;
          
          console.log('Notifica aggiunta:', newNotification);
        } else {
          console.log('Notifica duplicata ignorata:', errorData.message);
        }
      } else if (errorData.action === 'remove') {
        // Rimuovi notifica per campo specifico
        const currentNotifications = this.notifications();
        const filteredNotifications = currentNotifications.filter(n => n.fieldId !== errorData.fieldId);
        this.notifications.set(filteredNotifications);
        
        console.log(`Notifica rimossa per campo: ${errorData.fieldId}`);
      }
    } else {
      // Se non c'è errore, non fare nulla (mantieni le notifiche esistenti)
      console.log('Nessun errore da gestire');
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
        
        console.log('Notifica di successo aggiunta:', successNotification);
      } else {
        console.log('Notifica di successo duplicata ignorata:', success);
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
}