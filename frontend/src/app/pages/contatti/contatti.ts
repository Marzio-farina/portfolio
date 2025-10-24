import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Maps } from '../../components/maps/maps';
import { ContactForm } from '../../components/contact-form/contact-form';
import { Notification } from '../../components/notification/notification';

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
  
  // Gestione notifiche
  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'warning' | 'info' = 'error';

  onErrorChange(error: string | undefined) {
    if (error) {
      this.notificationMessage = error;
      this.notificationType = 'error';
      this.showNotification = true;
    } else {
      this.showNotification = false;
    }
  }
}