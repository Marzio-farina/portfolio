import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AttestatiCard } from '../../components/attestati-card/attestati-card';
import { AttestatiService } from '../../services/attestati.service';
import { Attestato } from '../../models/attestato.model';
import { AddAttestatoModalService } from '../../services/add-attestato-modal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Notification, NotificationType } from '../../components/notification/notification';
import { AuthService } from '../../services/auth.service';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  fieldId: string;
}

@Component({
  selector: 'app-attestati',
  imports: [AttestatiCard, Notification],
  templateUrl: './attestati.html',
  styleUrls: ['./attestati.css'],
})
export class Attestati {
  private route = inject(ActivatedRoute);
  private api   = inject(AttestatiService);
  private addAttestatoModal = inject(AddAttestatoModalService);
  private auth = inject(AuthService);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  // dati & stati
  attestati = signal<Attestato[]>([]);
  loading   = signal(true);
  errorMsg  = signal<string | null>(null);

  // Gestione notifiche multiple
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = signal(false);

  // Stato autenticazione - mostra il button solo se loggato
  isAuthenticated = computed(() => this.auth.isAuthenticated());

  constructor() {
    this.loadAttestati();

    // Ricarica gli attestati quando viene creato un nuovo attestato
    this.addAttestatoModal.onAttestatoCreated$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.loadAttestati();
      this.addNotification('success', 'Attestato creato con successo!', 'attestato-create');
    });

    // Gestisce gli errori dal modal di aggiunta attestato
    this.addAttestatoModal.onAttestatoError$.pipe(
      takeUntilDestroyed()
    ).subscribe((error) => {
      // Crea un fieldId unico per ogni errore, in modo da poter mostrare più errori contemporaneamente
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fieldId = `attestato-upload-${error.type}-${uniqueId}`;
      this.addNotification(error.type, error.message, fieldId);
    });
  }

  private loadAttestati(): void {
    this.loading.set(true);
    this.api.listAll$(1000).subscribe({
      next: data => { 
        this.attestati.set(data); 
        this.loading.set(false); 
      },
      error: (err: any) => { 
        const message = this.getErrorMessage(err) || 'Impossibile caricare gli attestati.';
        this.errorMsg.set(message);
        this.addNotification('error', message, 'attestati-load');
        this.loading.set(false); 
      }
    });
  }

  openAddAttestatoModal(): void {
    this.addAttestatoModal.open();
  }


  /**
   * Aggiunge una notifica alla lista
   */
  private addNotification(type: NotificationType, message: string, fieldId: string): void {
    const currentNotifications = this.notifications();
    
    // Controlla se esiste già una notifica con lo stesso messaggio e tipo (per evitare duplicati identici)
    const duplicate = currentNotifications.some(n => 
      n.message === message && 
      n.type === type && 
      // Per i fieldId con timestamp, confronta solo il prefisso
      (n.fieldId === fieldId || (fieldId.includes('-') && n.fieldId.startsWith(fieldId.split('-').slice(0, -1).join('-'))))
    );
    
    if (!duplicate) {
      const newNotification: NotificationItem = {
        id: `${fieldId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: message,
        type: type,
        timestamp: Date.now(),
        fieldId: fieldId
      };
      
      // Per fieldId fissi (come 'attestato-create'), rimuovi le notifiche precedenti con lo stesso fieldId
      // Per fieldId con timestamp, mantieni tutte le notifiche
      const hasTimestamp = /-\d+$/.test(fieldId);
      const filteredNotifications = hasTimestamp
        ? currentNotifications // Mantieni tutte le notifiche se il fieldId ha un timestamp
        : currentNotifications.filter(n => n.fieldId !== fieldId); // Rimuovi quelle con lo stesso fieldId se è fisso
      
      // Aggiungi la nuova notifica
      this.notifications.set([...filteredNotifications, newNotification]);
      this.showMultipleNotifications.set(true);
    }
  }

  /**
   * Ottiene la notifica più grave per l'icona nell'angolo
   */
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

  /**
   * Estrae il messaggio di errore dall'oggetto errore
   */
  private getErrorMessage(err: any): string | null {
    // Prova prima di estrarre dal payload (risposta JSON del backend)
    if (err?.payload?.message) {
      return err.payload.message;
    }
    // Se il payload è una stringa
    if (typeof err?.payload === 'string') {
      return err.payload;
    }
    // Prova dall'errore originale (HttpErrorResponse)
    if (err?.originalError?.error?.message) {
      return err.originalError.error.message;
    }
    if (typeof err?.originalError?.error === 'string') {
      return err.originalError.error;
    }
    // Prova dal messaggio dell'errore stesso
    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    // Nessun messaggio disponibile
    return null;
  }
}