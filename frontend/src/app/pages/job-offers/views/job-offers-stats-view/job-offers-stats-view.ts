import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map, forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobOfferService, JobOffer } from '../../../../services/job-offer.service';
import { JobOfferColumnService, JobOfferColumn } from '../../../../services/job-offer-column.service';
import { EditModeService } from '../../../../services/edit-mode.service';

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

  // Colonne visibili (filtrate)
  visibleColumns = computed(() => {
    return this.allColumns()
      .filter(col => col.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  // Lista candidature filtrate
  filteredJobOffers = computed(() => {
    let offers = this.allJobOffers();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();
    const location = this.selectedLocation();
    const viewType = this.viewType();

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
    this.router.navigate(['/job-offers']);
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
    
    return String(value);
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
}

