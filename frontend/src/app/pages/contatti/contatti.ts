import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Maps } from '../../components/maps/maps';
import { ContactForm } from '../../components/contact-form/contact-form';
import { Notification, NotificationType } from '../../components/notification/notification';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-contatti',
  imports: [
    Maps,
    ContactForm,
    Notification
  ],
  providers: [NotificationService],
  templateUrl: './contatti.html',
  styleUrl: './contatti.css'
})
export class Contatti {
  private route = inject(ActivatedRoute);
  protected notificationService = inject(NotificationService);
  
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  onErrorChange(errorData: {message: string, type: NotificationType, fieldId: string, action: 'add' | 'remove'} | undefined) {
    this.notificationService.handleErrorChange(errorData);
  }

  onSuccessChange(success: string | undefined) {
    if (success) {
      this.notificationService.addSuccess(success);
    }
  }

  getMostSevereNotification() {
    return this.notificationService.getMostSevere();
  }
}