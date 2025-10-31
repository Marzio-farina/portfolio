import { Component, inject, signal, computed, effect, ChangeDetectorRef, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TenantRouterService } from '../../services/tenant-router.service';
import { map } from 'rxjs';
import { AttestatiCard } from '../../components/attestati-card/attestati-card';
import { AttestatiService } from '../../services/attestati.service';
import { Attestato } from '../../models/attestato.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Notification, NotificationType } from '../../components/notification/notification';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { TenantService } from '../../services/tenant.service';
import { AttestatoDetailModalService } from '../../services/attestato-detail-modal.service';

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
  private edit = inject(EditModeService);
  private attestatoDetailModal = inject(AttestatoDetailModalService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  // dati & stati
  attestati = signal<Attestato[]>([]);
  
  // Flag per prevenire loop infiniti nell'aggiornamento
  private isUpdatingAttestato = false;
  
  // Flag per tracciare se abbiamo già caricato i dati una volta
  private hasLoadedOnce = false;
  loading   = signal(true);
  errorMsg  = signal<string | null>(null);

  // Gestione notifiche multiple
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = signal(false);

  // Stato autenticazione - mostra il button solo se loggato
  isAuthenticated = computed(() => this.auth.isAuthenticated());
  showEmptyAddCard = computed(() => this.isAuthenticated() && this.edit.isEditing());

  constructor() {
    // Non caricare qui - carichiamo in ngOnInit per permettere il reload su navigazione successiva
    // Se arriviamo con ?refresh=1, forza reload bypassando cache
    this.route.queryParamMap.subscribe(params => {
      const refresh = params.get('refresh');
      if (refresh === '1') {
        this.loadAttestati(true);
        // Opzionale: rimuovi i parametri dall'URL (senza ricaricare)
        this.router.navigate([], { queryParams: {}, replaceUrl: true, relativeTo: this.route });
      }
    });

    // Aggiorna immediatamente la card quando viene salvato un attestato (senza attendere la chiusura)
    effect(() => {
      const updatedAttestato = this.attestatoDetailModal.updatedAttestato();
      
      // Prevenzione loop: se stiamo già aggiornando, ignora
      if (!updatedAttestato || this.isUpdatingAttestato) {
        return;
      }
      
      // Imposta il flag per prevenire loop
      this.isUpdatingAttestato = true;
      
      try {
        // Trova l'attestato nella lista e aggiornalo
        const currentList = this.attestati();
        const index = currentList.findIndex(a => a.id === updatedAttestato.id);
        
        if (index !== -1) {
          // Crea una NUOVA lista con un NUOVO oggetto per l'attestato aggiornato
          // Questo è CRUCIALE per il change detection di Angular - deve essere un nuovo riferimento
          const newList = currentList.map((att, i) => {
            if (i === index) {
              // Crea un NUOVO oggetto con tutte le proprietà aggiornate
              // Usa spread operator per creare un nuovo oggetto completo
              return {
                ...updatedAttestato,
                // Assicurati che img sia anche un nuovo oggetto
                img: {
                  ...updatedAttestato.img
                }
              };
            }
            // Mantieni gli altri attestati così come sono (stesso riferimento è ok)
            return att;
          });
          
          // Aggiorna il signal con la nuova lista (questo triggera il change detection)
          this.attestati.set(newList);
          
          // Reset del signal dopo aver processato l'aggiornamento
          // Usa setTimeout per evitare che il reset avvenga durante l'esecuzione dell'effect
          setTimeout(() => {
            // Verifica che sia ancora lo stesso attestato (non è stato modificato nel frattempo)
            if (this.attestatoDetailModal.updatedAttestato() === updatedAttestato) {
              this.attestatoDetailModal.updatedAttestato.set(null);
            }
            // Reset del flag
            this.isUpdatingAttestato = false;
          }, 0);
        } else {
          // Se non trova l'attestato, potrebbe essere un problema di id
          console.warn('Attestato da aggiornare non trovato nella lista', updatedAttestato.id, 'Lista attuale:', currentList.map(a => a.id));
          // Reset anche in caso di errore per evitare loop
          this.attestatoDetailModal.updatedAttestato.set(null);
          this.isUpdatingAttestato = false;
        }
      } catch (error) {
        console.error('Errore durante l\'aggiornamento immediato dell\'attestato:', error);
        this.attestatoDetailModal.updatedAttestato.set(null);
        this.isUpdatingAttestato = false;
      }
    });

    // NOTA: Non ricarichiamo gli attestati alla chiusura del modal
    // Le modifiche sono già state applicate immediatamente quando si salva
    // La chiamata API verrà fatta automaticamente quando si naviga di nuovo al componente
  }

  ngOnInit(): void {
    // Se stiamo navigando a una rotta senza slug, assicuriamoci che il tenant sia pulito
    // Questo garantisce che non vediamo attestati di utenti specifici quando non dovremmo
    if (!this.route.snapshot.paramMap.has('userSlug')) {
      this.tenant.clear();
    }
    
    // Carica gli attestati al primo init
    if (!this.hasLoadedOnce) {
      this.loadAttestati();
      this.hasLoadedOnce = true;
    } else {
      // Navigazione successiva al componente: forza refresh per avere dati aggiornati dal backend
      // Questo gestisce il caso in cui Angular riutilizza il componente invece di crearlo ex novo
      this.loadAttestati(true);
    }

    // Ascolta le navigazioni per rilevare quando si torna al componente attestati
    // Traccia l'URL precedente per capire se si sta navigando VERSO attestati
    let previousUrl = this.router.url;
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: NavigationEnd) => {
      const currentUrl = event.url;
      
      // Se stiamo navigando VERSO /attestati (non da /attestati/nuovo) 
      // e non eravamo già su /attestati, e abbiamo già caricato una volta
      if (
        currentUrl.includes('/attestati') && 
        !currentUrl.includes('/attestati/nuovo') &&
        !previousUrl.includes('/attestati') &&
        this.hasLoadedOnce
      ) {
        // Forza refresh per avere i dati aggiornati dal backend
        setTimeout(() => {
          this.loadAttestati(true);
        }, 100);
      }
      
      previousUrl = currentUrl;
    });
  }

  ngOnDestroy(): void {
    // Non resettiamo hasLoadedOnce qui perché vogliamo che il reload avvenga
    // anche se il componente viene riutilizzato da Angular
  }

  private loadAttestati(forceRefresh = false): void {
    this.loading.set(true);
    // Usa userId solo se siamo su una rotta con slug utente
    // Se non c'è slug, non passare user_id per mostrare solo gli attestati dell'utente principale (ID 1)
    const hasSlug = this.route.snapshot.paramMap.has('userSlug');
    const uid = hasSlug ? this.tenant.userId() : null;
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
    // Se c'è uno userSlug, naviga al path specifico per utente
    // Altrimenti usa il path generico
    const userSlug = this.tenant.userSlug();
    if (userSlug) {
      this.router.navigate([`/${userSlug}/attestati/nuovo`]);
    } else {
      this.tenantRouter.navigate(['attestati','nuovo']);
    }
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