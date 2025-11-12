import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, forkJoin } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { JobOfferEmailService, JobOfferEmail } from '../../../../services/job-offer-email.service';
import { JobOfferEmailColumnService, JobOfferEmailColumn } from '../../../../services/job-offer-email-column.service';
import { TenantService } from '../../../../services/tenant.service';
import { EditModeService } from '../../../../services/edit-mode.service';
import { EmailSyncService, EmailSyncStats } from '../../../../services/email-sync.service';

type ViewType = 'email-total' | 'email-sent' | 'email-received' | 'email-bcc';

@Component({
  selector: 'app-job-offers-email-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-offers-email-view.html',
  styleUrl: './job-offers-email-view.css'
})
export class JobOffersEmailView implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private emailService = inject(JobOfferEmailService);
  private columnService = inject(JobOfferEmailColumnService);
  private tenantService = inject(TenantService);
  private editModeService = inject(EditModeService);
  private emailSyncService = inject(EmailSyncService);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  editMode = this.editModeService.isEditing;

  // Stato sincronizzazione
  syncing = signal<boolean>(false);
  syncMessage = signal<string>('');
  syncStats = signal<EmailSyncStats | null>(null);
  showSyncNotification = signal<boolean>(false);

  viewType = computed<ViewType>(() => {
    const url = window.location.pathname;
    if (url.includes('/email-sent')) return 'email-sent';
    if (url.includes('/email-received')) return 'email-received';
    if (url.includes('/email-bcc')) return 'email-bcc';
    return 'email-total';
  });

  loading = signal<boolean>(true);
  emails = signal<JobOfferEmail[]>([]);
  allColumns = signal<JobOfferEmailColumn[]>([]);

  // Filtri
  filtersVisible = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedDirection = signal<'all' | 'sent' | 'received'>('all');
  selectedStatus = signal<'all' | 'sent' | 'received' | 'queued' | 'failed'>('all');
  selectedCategory = signal<'all' | 'vip' | 'drafts' | 'junk' | 'trash' | 'archive'>('all');

  // Sorting
  sortColumn = signal<string>('sent_at');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Righe espanse
  expandedRows = signal<Set<number>>(new Set());

  // Popup opzioni tabella
  tableOptionsOpen = signal<boolean>(false);

  // Drag & Drop state
  draggedColumnId = signal<number | null>(null);
  dragOverColumnId = signal<number | null>(null);

  // Derived data
  visibleColumns = computed(() =>
    this.allColumns()
      .filter(col => col.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  );

  // Prime 4 colonne visibili (sempre mostrate)
  mainColumns = computed(() => {
    return this.visibleColumns().slice(0, 4);
  });

  // Contatori per filtri
  statsByDirection = computed(() => {
    const emails = this.emails();
    return {
      all: emails.length,
      sent: emails.filter(e => e.direction === 'sent').length,
      received: emails.filter(e => e.direction === 'received').length,
    };
  });

  statsByStatus = computed(() => {
    const emails = this.emails();
    return {
      all: emails.length,
      sent: emails.filter(e => e.status === 'sent').length,
      received: emails.filter(e => e.status === 'received').length,
      queued: emails.filter(e => e.status === 'queued').length,
      failed: emails.filter(e => e.status === 'failed').length,
    };
  });

  statsByCategory = computed(() => {
    const emails = this.emails();
    return {
      all: emails.length,
      vip: emails.filter(e => (e as any).is_vip).length,
      drafts: emails.filter(e => e.status === 'draft').length,
      junk: emails.filter(e => (e as any).is_junk).length,
      trash: emails.filter(e => (e as any).is_deleted).length,
      archive: emails.filter(e => (e as any).is_archived).length,
    };
  });

  filteredEmails = computed(() => {
    const emails = [...this.emails()];
    const query = this.searchQuery().toLowerCase();
    const directionFilter = this.selectedDirection();
    const statusFilter = this.selectedStatus();
    const type = this.viewType();
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();

    let result = emails;

    // View type filter
    if (type === 'email-sent') {
      result = result.filter(email => email.direction === 'sent');
    } else if (type === 'email-received') {
      result = result.filter(email => email.direction === 'received');
    } else if (type === 'email-bcc') {
      result = result.filter(email => email.has_bcc);
    }

    // Search
    if (query) {
      result = result.filter(email =>
        email.subject.toLowerCase().includes(query) ||
        (email.preview ?? '').toLowerCase().includes(query) ||
        (email.related_job_offer ?? '').toLowerCase().includes(query) ||
        email.to_recipients.some(to => to.toLowerCase().includes(query)) ||
        email.cc_recipients.some(cc => cc.toLowerCase().includes(query)) ||
        email.bcc_recipients.some(bcc => bcc.toLowerCase().includes(query))
      );
    }

    // Direction filter
    if (directionFilter !== 'all') {
      result = result.filter(email => email.direction === directionFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(email => email.status === statusFilter);
    }

    // Category filter
    const categoryFilter = this.selectedCategory();
    if (categoryFilter === 'vip') {
      result = result.filter(email => (email as any).is_vip);
    } else if (categoryFilter === 'drafts') {
      result = result.filter(email => email.status === 'draft');
    } else if (categoryFilter === 'junk') {
      result = result.filter(email => (email as any).is_junk);
    } else if (categoryFilter === 'trash') {
      result = result.filter(email => (email as any).is_deleted);
    } else if (categoryFilter === 'archive') {
      result = result.filter(email => (email as any).is_archived);
    }

    // Sorting
    result.sort((a, b) => {
      const aValue = this.getSortableValue(a, sortCol);
      const bValue = this.getSortableValue(b, sortCol);

      if (aValue === bValue) return 0;
      if (aValue === null) return sortDir === 'asc' ? 1 : -1;
      if (bValue === null) return sortDir === 'asc' ? -1 : 1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDir === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  ngOnInit(): void {
    // Carica solo i dati esistenti senza sincronizzazione automatica
    // (per evitare timeout lunghi all'apertura del componente)
    // L'utente può cliccare sul pulsante "Sincronizza" per aggiornare manualmente
    this.loadData();
  }

  /**
   * Sincronizza le email da iCloud e poi carica i dati
   */
  private syncAndLoadData(): void {
    this.syncing.set(true);
    this.loading.set(true);
    this.syncMessage.set('🔄 Sincronizzazione email iCloud in corso...');

    this.emailSyncService.syncEmails().subscribe({
      next: (response) => {
        this.syncing.set(false);
        
        if (response.success && response.stats) {
          this.syncStats.set(response.stats);
          
          // Mostra messaggio di successo con data sincronizzata
          const syncedDate = response.stats.synced_date ? new Date(response.stats.synced_date).toLocaleDateString('it-IT') : '';
          
          if (response.stats.imported > 0) {
            if (response.stats.imported >= 100) {
              this.syncMessage.set(`✅ ${response.stats.imported} email del ${syncedDate} sincronizzate! Clicca per continuare`);
            } else {
              this.syncMessage.set(`✅ ${response.stats.imported} email del ${syncedDate} sincronizzate!`);
            }
          } else if (response.stats.skipped > 0) {
            this.syncMessage.set(`✓ Nessuna nuova email trovata per il ${syncedDate}`);
          } else {
            this.syncMessage.set(`✓ Nessuna email trovata per il ${syncedDate}`);
          }
          
          this.showSyncNotification.set(true);
          
          // Nascondi notifica dopo 5 secondi (più tempo per leggere)
          setTimeout(() => {
            this.showSyncNotification.set(false);
          }, 5000);
        } else {
          this.syncMessage.set('⚠️ Errore durante la sincronizzazione');
          this.showSyncNotification.set(true);
          setTimeout(() => {
            this.showSyncNotification.set(false);
          }, 5000);
        }

        // Carica i dati dopo la sincronizzazione
        this.loadData();
      },
      error: (err) => {
        console.error('Errore sincronizzazione email:', err);
        this.syncing.set(false);
        this.syncMessage.set('❌ Impossibile sincronizzare le email');
        this.showSyncNotification.set(true);
        
        setTimeout(() => {
          this.showSyncNotification.set(false);
        }, 5000);

        // Carica comunque i dati esistenti
        this.loadData();
      }
    });
  }

  private loadData(): void {
    this.loading.set(true);
    
    forkJoin({
      columns: this.columnService.getUserColumns(),
      emails: this.emailService.getEmails()
    }).subscribe({
      next: ({ columns, emails }) => {
        this.allColumns.set(columns);
        this.emails.set(emails);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento email candidature:', err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Sincronizzazione manuale (chiamabile da UI)
   */
  manualSync(): void {
    if (this.syncing()) {
      return; // Evita sincronizzazioni multiple simultanee
    }
    this.syncAndLoadData();
  }

  toggleFilters(): void {
    this.filtersVisible.set(!this.filtersVisible());
  }

  showFiltersOnHover(): void {
    if (!this.filtersVisible()) {
      this.filtersVisible.set(true);
    }
  }

  /**
   * Seleziona un filtro Direzione e resetta gli altri filtri
   */
  selectDirection(direction: 'all' | 'sent' | 'received'): void {
    this.selectedDirection.set(direction);
    this.selectedCategory.set('all'); // Reset categoria quando cambia direzione
  }

  /**
   * Seleziona un filtro Categoria e resetta gli altri filtri
   */
  selectCategory(category: 'all' | 'vip' | 'drafts' | 'junk' | 'trash' | 'archive'): void {
    this.selectedCategory.set(category);
    this.selectedDirection.set('all'); // Reset direzione quando cambia categoria
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedDirection.set('all');
    this.selectedStatus.set('all');
    this.selectedCategory.set('all');
  }

  goBack(): void {
    const tenantSlug = this.tenantService.userSlug();
    const basePath = tenantSlug ? `/${tenantSlug}/job-offers` : '/job-offers';
    this.router.navigate([basePath]);
  }

  onSort(column: JobOfferEmailColumn): void {
    if (this.sortColumn() === column.field_name) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column.field_name);
      this.sortDirection.set(column.field_name === 'sent_at' ? 'desc' : 'asc');
    }
  }

  toggleColumnVisibility(columnId: number, currentVisible: boolean): void {
    const newVisible = !currentVisible;
    
    // Se si sta provando a rendere visibile una colonna
    if (newVisible) {
      const visibleCount = this.allColumns().filter(col => col.visible).length;
      if (visibleCount >= 4) {
        // Mostra messaggio o impedisci l'azione
        console.warn('Puoi visualizzare massimo 4 colonne alla volta');
        return;
      }
    } else {
      // Verifica che non sia l'ultima colonna visibile
      const visibleCount = this.allColumns().filter(col => col.visible).length;
      if (visibleCount <= 1) {
        console.warn('Deve esserci almeno una colonna visibile');
        return;
      }
    }

    // Update ottimistico locale
    const columns = this.allColumns().map(col =>
      col.id === columnId ? { ...col, visible: newVisible } : col
    );
    this.allColumns.set(columns);

    // Salva sul backend
    this.columnService.updateVisibility(columnId, newVisible).subscribe({
      next: () => {
        // Visibilità aggiornata con successo
      },
      error: (err: any) => {
        console.error('Errore aggiornamento visibilità colonna:', err);
        // Rollback in caso di errore
        this.loadData();
      }
    });
  }

  isColumnCheckboxDisabled(columnId: number): boolean {
    const column = this.allColumns().find(col => col.id === columnId);
    if (!column?.visible) {
      // Se la colonna è nascosta, verifica se sono già visibili 4 colonne
      const visibleCount = this.allColumns().filter(col => col.visible).length;
      return visibleCount >= 4; // Disabilita se sono già 4 visibili
    }
    
    // Se la colonna è visibile, disabilita solo se è l'unica visibile
    const visibleCount = this.allColumns().filter(col => col.visible).length;
    return visibleCount <= 1; // Disabilita se è l'unica visibile
  }

  toggleTableOptions(): void {
    this.tableOptionsOpen.set(!this.tableOptionsOpen());
  }

  closeTableOptions(): void {
    this.tableOptionsOpen.set(false);
  }

  // === DRAG & DROP PER RIORDINARE COLONNE ===

  onDragStart(event: DragEvent, columnId: number): void {
    this.draggedColumnId.set(columnId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, columnId: number): void {
    event.preventDefault();
    if (this.draggedColumnId() !== columnId) {
      this.dragOverColumnId.set(columnId);
    }
  }

  onDragLeave(event: DragEvent): void {
    this.dragOverColumnId.set(null);
  }

  onDrop(event: DragEvent, targetColumnId: number): void {
    event.preventDefault();
    
    const draggedId = this.draggedColumnId();
    if (!draggedId || draggedId === targetColumnId) return;

    // Trova gli indici delle colonne
    const columns = [...this.allColumns()];
    const draggedIndex = columns.findIndex(c => c.id === draggedId);
    const targetIndex = columns.findIndex(c => c.id === targetColumnId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Rimuovi l'elemento trascinato
    const [draggedColumn] = columns.splice(draggedIndex, 1);
    // Inseriscilo nella nuova posizione
    columns.splice(targetIndex, 0, draggedColumn);

    // Aggiorna l'ordine di tutte le colonne
    const updatedColumns = columns.map((col, index) => ({
      ...col,
      order: index
    }));

    // Update ottimistico
    this.allColumns.set(updatedColumns);

    // Reset drag state
    this.draggedColumnId.set(null);
    this.dragOverColumnId.set(null);

    // Salva l'ordine sul backend
    const columnOrder = updatedColumns.map(col => ({ id: col.id, order: col.order || 0 }));
    this.columnService.updateOrder(columnOrder).subscribe({
      error: (err: any) => {
        console.error('Errore salvataggio ordine colonne:', err);
        this.loadData(); // Rollback
      }
    });
  }

  onDragEnd(): void {
    this.draggedColumnId.set(null);
    this.dragOverColumnId.set(null);
  }

  isColumnDragging(columnId: number): boolean {
    return this.draggedColumnId() === columnId;
  }

  isColumnDropTarget(columnId: number): boolean {
    return this.dragOverColumnId() === columnId && this.draggedColumnId() !== columnId;
  }

  toggleRowExpansion(emailId: number): void {
    const expanded = new Set(this.expandedRows());
    if (expanded.has(emailId)) {
      expanded.delete(emailId);
    } else {
      expanded.add(emailId);
    }
    this.expandedRows.set(expanded);
  }

  isRowExpanded(emailId: number): boolean {
    return this.expandedRows().has(emailId);
  }

  getDirectionLabel(direction: string): string {
    return direction === 'sent' ? 'Inviata' : 'Ricevuta';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      sent: 'Inviata',
      received: 'Ricevuta',
      queued: 'In coda',
      failed: 'Fallita'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      sent: 'badge-success',
      received: 'badge-info',
      queued: 'badge-warning',
      failed: 'badge-error'
    };
    return map[status] ?? 'badge-neutral';
  }

  getDirectionClass(direction: string): string {
    return direction === 'sent' ? 'tag-outgoing' : 'tag-incoming';
  }

  getColumnFallback(email: JobOfferEmail, fieldName: string): string | number | null {
    const data = email as unknown as Record<string, any>;
    return data[fieldName] ?? null;
  }

  private getSortableValue(email: JobOfferEmail, column: string): string | number | null {
    switch (column) {
      case 'subject':
        return email.subject;
      case 'direction':
        return email.direction;
      case 'status':
        return email.status;
      case 'bcc':
        return email.bcc_count;
      case 'sent_at':
        return email.sent_at ? new Date(email.sent_at).getTime() : null;
      default:
        return null;
    }
  }
}

