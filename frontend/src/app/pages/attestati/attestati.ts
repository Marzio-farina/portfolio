import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantRouterService } from '../../services/tenant-router.service';
import { map } from 'rxjs';
import { AttestatiCard } from '../../components/attestati-card/attestati-card';
import { AttestatiService } from '../../services/attestati.service';
import { Attestato } from '../../models/attestato.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Notification, NotificationType } from '../../components/notification/notification';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';

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
  private router = inject(Router);
  private tenantRouter = inject(TenantRouterService);
  private auth = inject(AuthService);
  private tenant = inject(TenantService);

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
    // Se arriviamo con ?refresh=1, forza reload bypassando cache
    this.route.queryParamMap.subscribe(params => {
      const refresh = params.get('refresh');
      if (refresh === '1') {
        this.loadAttestati(true);
        // Opzionale: rimuovi i parametri dall'URL (senza ricaricare)
        this.router.navigate([], { queryParams: {}, replaceUrl: true, relativeTo: this.route });
      }
    });
  }

  private loadAttestati(forceRefresh = false): void {
    this.loading.set(true);
    const uid = this.tenant.userId();
    this.api.listAll$(1000, {}, forceRefresh, uid ?? undefined).subscribe({
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

  goToAddAttestato(): void {
    this.tenantRouter.navigate(['attestati','nuovo']);
  }

  onCardDeleted(id: number): void {
    this.attestati.set(this.attestati().filter(x => x.id !== id));
    this.addNotification('success', 'Attestato rimosso.', `attestato-deleted-${id}`);
    // Forza una nuova fetch senza cache
    this.loadAttestati(true);
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