import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map, forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobOfferService, JobOffer } from '../../../../services/job-offer.service';
import { JobOfferColumnService, JobOfferColumn } from '../../../../services/job-offer-column.service';
import { EditModeService } from '../../../../services/edit-mode.service';
import { TenantService } from '../../../../services/tenant.service';

@Component({
  selector: 'app-job-offers-stats-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-offers-stats-view.html',
  styleUrl: './job-offers-stats-view.css'
})
export class JobOffersStatsView implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobOfferService = inject(JobOfferService);
  private columnService = inject(JobOfferColumnService);
  private editModeService = inject(EditModeService);
  private tenantService = inject(TenantService);
  
  // Legge il titolo dalla route data
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  
  // Edit mode dal service globale
  editMode = this.editModeService.isEditing;
  
  // Determina il tipo di vista dalla route path
  viewType = computed(() => {
    const url = window.location.pathname;
    if (url.includes('/total')) return 'total';
    if (url.includes('/pending')) return 'pending';
    if (url.includes('/interview')) return 'interview';
    if (url.includes('/accepted')) return 'accepted';
    if (url.includes('/archived')) return 'archived';
    if (url.includes('/email')) return 'email';
    return 'total';
  });

  // Dati delle candidature dal backend
  allJobOffers = signal<JobOffer[]>([]);
  
  // Colonne configurate dall'utente
  allColumns = signal<JobOfferColumn[]>([]);
  
  // Loading state
  loading = signal<boolean>(true);

  // Filtri
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  selectedLocation = signal<string>('all');
  
  // Visibilità filtri
  filtersVisible = signal<boolean>(false);
  
  // Popup opzioni tabella
  tableOptionsOpen = signal<boolean>(false);
  
  // Righe espanse (track degli ID delle righe espanse)
  expandedRows = signal<Set<number>>(new Set());
  
  // Ordinamento tabella
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');
  
  // Drag & Drop state
  draggedColumnId = signal<number | null>(null);
  dragOverColumnId = signal<number | null>(null);
  
  // Array di placeholder per skeleton rows
  skeletonRows = computed(() => {
    const count = 8; // Numero di righe skeleton da mostrare
    return Array.from({ length: count }, (_, i) => i);
  });
  
  // Colonne placeholder per skeleton iniziale (prima del caricamento)
  skeletonColumns = computed(() => {
    const count = 4; // Numero di colonne placeholder (default visibili)
    return Array.from({ length: count }, (_, i) => i);
  });

  ngOnInit(): void {
    this.loadData();
  }

  // Carica job offers e configurazione colonne dal backend
  private loadData(): void {
    this.loading.set(true);
    
    // Carica in parallelo job offers e colonne
    forkJoin({
      offers: this.jobOfferService.getJobOffers(),
      columns: this.columnService.getUserColumns()
    }).subscribe({
      next: ({ offers, columns }) => {
        this.allJobOffers.set(offers);
        this.allColumns.set(columns);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento dati:', err);
        this.loading.set(false);
      }
    });
  }

  // Colonne visibili (filtrate e ordinate)
  visibleColumns = computed(() => {
    return this.allColumns()
      .filter(col => col.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  // Prime 4 colonne visibili (sempre mostrate)
  mainColumns = computed(() => {
    return this.visibleColumns().slice(0, 4);
  });

  // Colonne extra (oltre le prime 4, mostrate solo quando espanse)
  extraColumns = computed(() => {
    return this.visibleColumns().slice(4);
  });

  // Lista candidature filtrate e ordinate
  filteredJobOffers = computed(() => {
    let offers = this.allJobOffers();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();
    const location = this.selectedLocation();
    const viewType = this.viewType();
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();

    // Escludi sempre i record con status 'search' (offerte da ricerca scraping)
    offers = offers.filter(offer => offer.status !== 'search');

    // Filtra per view type
    if (viewType !== 'total' && viewType !== 'email') {
      offers = offers.filter(offer => offer.status === viewType);
    }

    // Filtra per ricerca
    if (query) {
      offers = offers.filter(offer =>
        offer.company_name.toLowerCase().includes(query) ||
        offer.position.toLowerCase().includes(query)
      );
    }

    // Filtra per status
    if (status !== 'all') {
      offers = offers.filter(offer => offer.status === status);
    }

    // Filtra per location
    if (location !== 'all') {
      offers = offers.filter(offer => offer.location === location);
    }

    // Ordina se una colonna è selezionata
    if (sortCol) {
      offers = [...offers].sort((a, b) => {
        const aValue = this.getFieldValue(a, sortCol);
        const bValue = this.getFieldValue(b, sortCol);
        
        // Gestione valori null/undefined
        if (aValue === null || aValue === undefined) return sortDir === 'asc' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortDir === 'asc' ? -1 : 1;
        
        // Confronto valori
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }

    return offers;
  });

  // Lista locations uniche
  uniqueLocations = computed(() => {
    const locations = new Set(
      this.allJobOffers()
        .map(offer => offer.location)
        .filter(loc => loc !== null)
    );
    return Array.from(locations).sort();
  });

  // Torna alla pagina principale delle statistiche
  goBack(): void {
    const tenantSlug = this.tenantService.userSlug();
    const basePath = tenantSlug ? `/${tenantSlug}/job-offers` : '/job-offers';
    this.router.navigate([basePath]);
  }

  // Reset filtri
  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set('all');
    this.selectedLocation.set('all');
  }

  // Toggle visibilità filtri
  toggleFilters(): void {
    this.filtersVisible.set(!this.filtersVisible());
  }

  // Toggle popup opzioni tabella
  toggleTableOptions(): void {
    this.tableOptionsOpen.set(!this.tableOptionsOpen());
  }

  // Chiudi popup opzioni
  closeTableOptions(): void {
    this.tableOptionsOpen.set(false);
  }

  // Toggle visibilità colonna
  toggleColumnVisibility(columnId: number, visible: boolean): void {
    // Verifica: non permettere di nascondere l'ultima colonna visibile
    if (!visible) {
      const visibleCount = this.allColumns().filter(col => col.visible).length;
      if (visibleCount <= 1) {
        // Mostra un avviso (opzionale) o semplicemente non eseguire l'azione
        return; // Impedisci di nascondere l'ultima colonna
      }
    }

    // Update ottimistico locale
    const columns = this.allColumns().map(col => 
      col.id === columnId ? { ...col, visible } : col
    );
    this.allColumns.set(columns);

    // Salva sul backend
    this.columnService.updateVisibility(columnId, visible).subscribe({
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

  // Verifica se una checkbox colonna deve essere disabilitata (ultima visibile)
  isColumnCheckboxDisabled(columnId: number): boolean {
    const column = this.allColumns().find(col => col.id === columnId);
    if (!column?.visible) return false; // Non disabilitare se già nascosta
    
    const visibleCount = this.allColumns().filter(col => col.visible).length;
    return visibleCount <= 1; // Disabilita se è l'unica visibile
  }

  // === ESPANSIONE RIGHE ===

  // Toggle espansione riga
  toggleRowExpansion(offerId: number): void {
    const expanded = new Set(this.expandedRows());
    if (expanded.has(offerId)) {
      expanded.delete(offerId);
    } else {
      expanded.add(offerId);
    }
    this.expandedRows.set(expanded);
  }

  // Verifica se una riga è espansa
  isRowExpanded(offerId: number): boolean {
    return this.expandedRows().has(offerId);
  }

  // Verifica se ci sono colonne extra da mostrare
  hasExtraColumns(): boolean {
    return this.extraColumns().length > 0;
  }

  // Gestisce il click sull'header per ordinare
  onColumnSort(fieldName: string): void {
    const currentSortCol = this.sortColumn();
    
    if (currentSortCol === fieldName) {
      // Stessa colonna: inverti direzione
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // Nuova colonna: imposta ascendente
      this.sortColumn.set(fieldName);
      this.sortDirection.set('asc');
    }
  }

  // Ottieni badge class per status
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'badge-warning',
      interview: 'badge-info',
      accepted: 'badge-success',
      rejected: 'badge-error',
      archived: 'badge-ghost'
    };
    return classes[status] || 'badge-ghost';
  }

  // Ottieni label tradotta per status
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'In Attesa',
      interview: 'Colloquio',
      accepted: 'Accettata',
      rejected: 'Rifiutata',
      archived: 'Archiviata'
    };
    return labels[status] || status;
  }

  // Ottieni il valore di un campo dinamicamente
  getFieldValue(offer: JobOffer, fieldName: string): any {
    return (offer as any)[fieldName];
  }

  // Formatta il valore per la visualizzazione
  formatValue(value: any, fieldName: string): string {
    if (value === null || value === undefined) return '-';
    
    // Boolean
    if (fieldName === 'is_registered') {
      return value ? 'Sì' : 'No';
    }
    
    // Status con badge (gestito separatamente nel template)
    if (fieldName === 'status') {
      return this.getStatusLabel(value);
    }
    
    // Date (application_date, announcement_date)
    if (fieldName === 'application_date' || fieldName === 'announcement_date') {
      return this.formatDate(value);
    }
    
    return String(value);
  }

  // Formatta una data in formato italiano DD/MM/YYYY
  private formatDate(dateString: string): string {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString; // Fallback al valore originale se non è una data valida
    }
  }

  // Verifica se una colonna richiede formattazione speciale
  isSpecialField(fieldName: string): boolean {
    return ['status', 'location', 'company_name'].includes(fieldName);
  }

  // === DRAG & DROP COLONNE ===

  // Inizia drag della colonna
  onDragStart(event: DragEvent, columnId: number): void {
    if (!this.editMode()) return;
    
    this.draggedColumnId.set(columnId);
    
    // Imposta l'effetto di trascinamento
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', '');
    }
  }

  // Drag over su una colonna (per mostrare feedback visivo)
  onDragOver(event: DragEvent, columnId: number): void {
    if (!this.editMode()) return;
    
    event.preventDefault();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    // Imposta la colonna su cui si sta hovering
    if (this.draggedColumnId() !== columnId) {
      this.dragOverColumnId.set(columnId);
    }
  }

  // Lascia la zona di drop
  onDragLeave(event: DragEvent): void {
    if (!this.editMode()) return;
    this.dragOverColumnId.set(null);
  }

  // Drop della colonna
  onDrop(event: DragEvent, targetColumnId: number): void {
    if (!this.editMode()) return;
    
    event.preventDefault();
    
    const draggedId = this.draggedColumnId();
    if (!draggedId || draggedId === targetColumnId) {
      this.draggedColumnId.set(null);
      this.dragOverColumnId.set(null);
      return;
    }

    // Riordina le colonne
    this.reorderColumns(draggedId, targetColumnId);
    
    // Reset drag state
    this.draggedColumnId.set(null);
    this.dragOverColumnId.set(null);
  }

  // Fine del drag (pulizia)
  onDragEnd(): void {
    this.draggedColumnId.set(null);
    this.dragOverColumnId.set(null);
  }

  // Riordina le colonne localmente e salva sul backend
  private reorderColumns(draggedId: number, targetId: number): void {
    const columns = [...this.visibleColumns()];
    
    // Trova gli indici
    const draggedIndex = columns.findIndex(col => col.id === draggedId);
    const targetIndex = columns.findIndex(col => col.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Rimuovi la colonna trascinata
    const [draggedColumn] = columns.splice(draggedIndex, 1);
    
    // Inserisci nella nuova posizione
    columns.splice(targetIndex, 0, draggedColumn);
    
    // Aggiorna gli ordini
    const updatedColumns = columns.map((col, index) => ({
      ...col,
      order: index
    }));
    
    // Aggiorna lo stato locale (ottimistico)
    const allCols = this.allColumns().map(col => {
      const updated = updatedColumns.find(uc => uc.id === col.id);
      return updated ? updated : col;
    });
    this.allColumns.set(allCols);
    
    // Salva sul backend
    const columnIds = updatedColumns.map(col => col.id);
    this.columnService.updateColumnOrder(columnIds).subscribe({
      next: (response: JobOfferColumn[]) => {
        // Ordine colonne aggiornato con successo
      },
      error: (err: any) => {
        console.error('Errore aggiornamento ordine colonne:', err);
        // In caso di errore, ricarica i dati
        this.loadData();
      }
    });
  }

  // Verifica se una colonna è in dragging
  isColumnDragging(columnId: number): boolean {
    return this.draggedColumnId() === columnId;
  }

  // Verifica se una colonna è target del drop
  isColumnDropTarget(columnId: number): boolean {
    return this.dragOverColumnId() === columnId && this.draggedColumnId() !== columnId;
  }

  /**
   * Naviga alla vista di aggiunta candidatura
   */
  navigateToAddJobOffer(): void {
    const tenantSlug = this.tenantService.userSlug();
    const basePath = tenantSlug ? `/${tenantSlug}/job-offers/add` : '/job-offers/add';
    this.router.navigate([basePath]);
  }
}

