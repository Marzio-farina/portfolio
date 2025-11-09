import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobOfferColumnService, JobOfferColumn } from '../../../../services/job-offer-column.service';
import { JobScraperService, ScrapedJob } from '../../../../services/job-scraper.service';
import { EditModeService } from '../../../../services/edit-mode.service';
import { TenantService } from '../../../../services/tenant.service';
import { SafeUrlPipe } from '../../../../pipes/safe-url.pipe';

/**
 * Componente per visualizzare i risultati dello scraping
 * Usa la stessa struttura di job-offers-stats-view ma con dati da Adzuna
 */
@Component({
  selector: 'app-job-offers-scraper-results-view',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe],
  templateUrl: './job-offers-scraper-results-view.html',
  styleUrl: './job-offers-scraper-results-view.css'
})
export class JobOffersScraperResultsView implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private columnService = inject(JobOfferColumnService);
  private scraperService = inject(JobScraperService);
  private editModeService = inject(EditModeService);
  private tenantService = inject(TenantService);
  
  // Edit mode dal service globale
  editMode = this.editModeService.isEditing;
  
  // Dati delle offerte scrapate
  scrapedJobs = signal<ScrapedJob[]>([]);
  
  // Colonne configurate dall'utente (stesse di job-offers-stats-view)
  allColumns = signal<JobOfferColumn[]>([]);
  
  // Loading state
  loading = signal<boolean>(true);

  // Filtri tabella risultati
  searchQuery = signal<string>('');
  selectedLocation = signal<string>('all');
  selectedEmploymentType = signal<string>('all');
  selectedRemote = signal<string>('all');
  selectedCompany = signal<string>('all');
  selectedSalaryFilter = signal<string>('all'); // 'all', 'with', 'without'
  minSalary = signal<number | null>(null);
  maxSalary = signal<number | null>(null);
  
  // Parametri ricerca Adzuna
  searchKeyword = signal<string>('');
  searchLocationInput = signal<string>('');
  resultsLimit = signal<number>(50);
  
  // Visibilità filtri (di default visibili)
  filtersVisible = signal<boolean>(true);
  
  // Righe espanse
  expandedRows = signal<Set<string>>(new Set());
  
  // Ordinamento tabella
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');
  
  // Drag & Drop state
  draggedColumnId = signal<number | null>(null);
  dragOverColumnId = signal<number | null>(null);
  
  // Popup opzioni tabella
  tableOptionsOpen = signal<boolean>(false);
  
  // Dialog per visualizzare link offerta
  jobUrlDialogOpen = signal<boolean>(false);
  selectedJobUrl = signal<string>('');
  
  // Array placeholder per skeleton
  skeletonRows = computed(() => Array.from({ length: 8 }, (_, i) => i));
  skeletonColumns = computed(() => Array.from({ length: 4 }, (_, i) => i));

  ngOnInit(): void {
    // Carica solo le colonne configurate
    this.loadInitialData();
  }

  /**
   * Carica colonne configurate dall'utente
   * I campi di ricerca rimangono vuoti per input manuale
   */
  private loadInitialData(): void {
    this.columnService.getUserColumns().subscribe({
      next: (columns) => {
        this.allColumns.set(columns);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento colonne:', err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Esegue la ricerca tramite Adzuna (chiamato dal pulsante Cerca)
   * Usa tutti i parametri di ricerca impostati nei filtri
   */
  performSearch(): void {
    const keyword = this.searchKeyword().trim();
    
    if (!keyword) {
      console.warn('⚠️ Keyword di ricerca mancante');
      return;
    }

    console.log('🔍 Ricerca offerte tramite Adzuna con parametri:', {
      keyword,
      location: this.searchLocationInput(),
      limit: this.resultsLimit()
    });
    
    this.loading.set(true);
    
    const params = {
      keyword: keyword,
      location: this.searchLocationInput() || 'Italia',
      limit: this.resultsLimit()
    };

    this.scraperService.scrapeAdzuna(params).subscribe({
      next: (response) => {
        console.log('✅ Adzuna scraping completato:', response);
        console.log(`📊 Trovate ${response.count} offerte:`, response.jobs);
        this.scrapedJobs.set(response.jobs);
        this.loading.set(false);
        
        // Reset filtri raffinamento dopo nuova ricerca
        this.selectedCompany.set('all');
        this.selectedLocation.set('all');
        this.selectedEmploymentType.set('all');
        this.selectedRemote.set('all');
        this.selectedSalaryFilter.set('all');
        this.minSalary.set(null);
        this.maxSalary.set(null);
      },
      error: (err) => {
        console.error('❌ Errore scraping:', err);
        this.loading.set(false);
      }
    });
  }

  // Colonne visibili (filtrate e ordinate, escluso 'Sito Web' perché gestito dalla colonna "Candidati")
  visibleColumns = computed(() => {
    return this.allColumns()
      .filter(col => col.visible && col.field_name !== 'website')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  /**
   * Determina le prime 3 colonne da mostrare basandosi sui filtri attivi
   * Priorità: campi usati nella ricerca
   */
  dynamicColumns = computed(() => {
    const cols = this.allColumns();
    const dynamicCols: JobOfferColumn[] = [];
    
    // 1. Se ha cercato per azienda (company sempre mostrata)
    const companyCol = cols.find(col => col.field_name === 'company_name');
    if (companyCol) dynamicCols.push(companyCol);
    
    // 2. Se ha specificato località, mostra località
    if (this.searchLocationInput()) {
      const locationCol = cols.find(col => col.field_name === 'location');
      if (locationCol && dynamicCols.length < 3) dynamicCols.push(locationCol);
    }
    
    // 3. Posizione sempre mostrata
    const positionCol = cols.find(col => col.field_name === 'position');
    if (positionCol && dynamicCols.length < 3) dynamicCols.push(positionCol);
    
    // 4. Se manca spazio, aggiungi altre colonne visibili
    const remainingCols = this.visibleColumns().filter(col => 
      !dynamicCols.find(dc => dc.id === col.id)
    );
    
    while (dynamicCols.length < 3 && remainingCols.length > 0) {
      const nextCol = remainingCols.shift();
      if (nextCol) dynamicCols.push(nextCol);
    }
    
    return dynamicCols;
  });

  // Prime 3 colonne dinamiche (sempre le 3 selezionate dinamicamente)
  mainColumns = computed(() => this.dynamicColumns());

  // Colonne extra (tutte le altre colonne visibili non mostrate nelle prime 3)
  extraColumns = computed(() => {
    const dynamicIds = this.dynamicColumns().map(col => col.id);
    return this.visibleColumns().filter(col => !dynamicIds.includes(col.id));
  });

  // Offerte filtrate e ordinate
  filteredJobs = computed(() => {
    let jobs = this.scrapedJobs();
    const query = this.searchQuery().toLowerCase();
    const location = this.selectedLocation();
    const employmentType = this.selectedEmploymentType();
    const remote = this.selectedRemote();
    const company = this.selectedCompany();
    const salaryFilter = this.selectedSalaryFilter();
    const minSal = this.minSalary();
    const maxSal = this.maxSalary();
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();

    // Filtra per ricerca testuale
    if (query) {
      jobs = jobs.filter(job =>
        job.company.toLowerCase().includes(query) ||
        job.title.toLowerCase().includes(query)
      );
    }

    // Filtra per azienda
    if (company !== 'all') {
      jobs = jobs.filter(job => job.company === company);
    }

    // Filtra per location
    if (location !== 'all') {
      jobs = jobs.filter(job => job.location === location);
    }

    // Filtra per employment type
    if (employmentType !== 'all') {
      jobs = jobs.filter(job => job.employment_type === employmentType);
    }

    // Filtra per remote
    if (remote !== 'all') {
      jobs = jobs.filter(job => job.remote === remote);
    }

    // Filtra per stipendio (con/senza)
    if (salaryFilter === 'with') {
      jobs = jobs.filter(job => job.salary && job.salary !== 'Non specificato' && job.salary !== 'N/A');
    } else if (salaryFilter === 'without') {
      jobs = jobs.filter(job => !job.salary || job.salary === 'Non specificato' || job.salary === 'N/A');
    }

    // Filtra per range stipendio (min/max)
    if (minSal !== null || maxSal !== null) {
      jobs = jobs.filter(job => {
        const salaryNum = this.extractSalaryNumber(job.salary);
        if (salaryNum === null) return false;
        
        if (minSal !== null && salaryNum < minSal) return false;
        if (maxSal !== null && salaryNum > maxSal) return false;
        
        return true;
      });
    }

    // Ordina se una colonna è selezionata
    if (sortCol) {
      jobs = [...jobs].sort((a, b) => {
        const aValue = this.getFieldValue(a, sortCol);
        const bValue = this.getFieldValue(b, sortCol);
        
        if (aValue === null || aValue === undefined) return sortDir === 'asc' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortDir === 'asc' ? -1 : 1;
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }

    return jobs;
  });

  // Lista locations uniche
  uniqueLocations = computed(() => {
    const locations = new Set(
      this.scrapedJobs()
        .map(job => job.location)
        .filter(loc => loc !== null && loc !== '' && loc !== 'N/A')
    );
    return Array.from(locations).sort();
  });

  // Lista employment types unici
  uniqueEmploymentTypes = computed(() => {
    const types = new Set(
      this.scrapedJobs()
        .map(job => job.employment_type)
        .filter(type => type !== null && type !== undefined && type !== 'N/A')
    );
    return Array.from(types).sort();
  });

  // Lista remote types unici
  uniqueRemoteTypes = computed(() => {
    const types = new Set(
      this.scrapedJobs()
        .map(job => job.remote)
        .filter(type => type !== null && type !== undefined && type !== 'N/A')
    );
    return Array.from(types).sort();
  });

  // Lista aziende uniche
  uniqueCompanies = computed(() => {
    const companies = new Set(
      this.scrapedJobs()
        .map(job => job.company)
        .filter(comp => comp !== null && comp !== undefined && comp !== 'N/A')
    );
    return Array.from(companies).sort();
  });

  // Torna alla pagina di aggiunta
  goBack(): void {
    const tenantSlug = this.tenantService.userSlug();
    const basePath = tenantSlug ? `/${tenantSlug}/job-offers/add` : '/job-offers/add';
    this.router.navigate([basePath]);
  }

  // Reset tutti i filtri (ricerca e raffinamento)
  resetFilters(): void {
    // Reset filtri ricerca
    this.searchKeyword.set('');
    this.searchLocationInput.set('');
    this.resultsLimit.set(50);
    
    // Reset filtri raffinamento
    this.searchQuery.set('');
    this.selectedLocation.set('all');
    this.selectedEmploymentType.set('all');
    this.selectedRemote.set('all');
    this.selectedCompany.set('all');
    this.selectedSalaryFilter.set('all');
    this.minSalary.set(null);
    this.maxSalary.set(null);
    
    // Pulisci risultati
    this.scrapedJobs.set([]);
  }

  // Toggle visibilità filtri
  toggleFilters(): void {
    this.filtersVisible.set(!this.filtersVisible());
  }

  // Verifica se ci sono colonne extra da mostrare nell'espansione
  hasExtraColumns(): boolean {
    return this.extraColumns().length > 0;
  }

  /**
   * Apre il dialog con l'iframe del link dell'offerta
   */
  openJobUrl(url: string): void {
    this.selectedJobUrl.set(url);
    this.jobUrlDialogOpen.set(true);
  }

  /**
   * Chiude il dialog del link offerta
   */
  closeJobUrlDialog(): void {
    this.jobUrlDialogOpen.set(false);
    this.selectedJobUrl.set('');
  }

  // Toggle espansione riga
  toggleRowExpansion(jobId: string): void {
    const expanded = new Set(this.expandedRows());
    if (expanded.has(jobId)) {
      expanded.delete(jobId);
    } else {
      expanded.add(jobId);
    }
    this.expandedRows.set(expanded);
  }

  // Verifica se una riga è espansa
  isRowExpanded(jobId: string): boolean {
    return this.expandedRows().has(jobId);
  }

  // Gestisce il click sull'header per ordinare
  onColumnSort(fieldName: string): void {
    const currentSortCol = this.sortColumn();
    
    if (currentSortCol === fieldName) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(fieldName);
      this.sortDirection.set('asc');
    }
  }

  /**
   * Mappa i campi dello scraper ai campi del database
   */
  getFieldValue(job: ScrapedJob, fieldName: string): any {
    const mapping: Record<string, any> = {
      'company_name': job.company,
      'position': job.title,
      'location': job.location,
      'announcement_date': job.posted_date,
      'website': job.url,
      'salary_range': job.salary,
      'work_mode': this.formatWorkMode(job.employment_type, job.remote),
      'notes': job.description,
      // Campi non forniti da Adzuna
      'recruiter_company': null,
      'application_date': null,
      'is_registered': false,
      'status': 'pending'
    };
    
    return mapping[fieldName] ?? null;
  }

  /**
   * Combina employment_type e remote per work_mode
   */
  private formatWorkMode(employmentType?: string, remote?: string): string {
    const parts = [];
    if (employmentType) parts.push(employmentType);
    if (remote && remote !== 'N/A') parts.push(remote);
    return parts.join(' - ') || 'Non specificato';
  }

  /**
   * Formatta il valore per la visualizzazione
   */
  formatValue(value: any, fieldName: string): string {
    if (value === null || value === undefined) return '-';
    
    if (fieldName === 'is_registered') {
      return value ? 'Sì' : 'No';
    }
    
    if (fieldName === 'announcement_date' || fieldName === 'application_date') {
      return this.formatDate(value);
    }
    
    return String(value);
  }

  /**
   * Formatta una data in formato italiano DD/MM/YYYY
   */
  private formatDate(dateString: string): string {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  }

  // Metodi drag & drop (copiati da stats-view)
  onDragStart(event: DragEvent, columnId: number): void {
    if (!this.editMode()) return;
    this.draggedColumnId.set(columnId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', '');
    }
  }

  onDragOver(event: DragEvent, columnId: number): void {
    if (!this.editMode()) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.draggedColumnId() !== columnId) {
      this.dragOverColumnId.set(columnId);
    }
  }

  onDragLeave(event: DragEvent): void {
    if (!this.editMode()) return;
    this.dragOverColumnId.set(null);
  }

  onDrop(event: DragEvent, targetColumnId: number): void {
    if (!this.editMode()) return;
    event.preventDefault();
    
    const draggedId = this.draggedColumnId();
    if (!draggedId || draggedId === targetColumnId) {
      this.draggedColumnId.set(null);
      this.dragOverColumnId.set(null);
      return;
    }

    this.reorderColumns(draggedId, targetColumnId);
    this.draggedColumnId.set(null);
    this.dragOverColumnId.set(null);
  }

  onDragEnd(): void {
    this.draggedColumnId.set(null);
    this.dragOverColumnId.set(null);
  }

  private reorderColumns(draggedId: number, targetId: number): void {
    const columns = [...this.visibleColumns()];
    const draggedIndex = columns.findIndex(col => col.id === draggedId);
    const targetIndex = columns.findIndex(col => col.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const [draggedColumn] = columns.splice(draggedIndex, 1);
    columns.splice(targetIndex, 0, draggedColumn);
    
    const updatedColumns = columns.map((col, index) => ({
      ...col,
      order: index
    }));
    
    const allCols = this.allColumns().map(col => {
      const updated = updatedColumns.find(uc => uc.id === col.id);
      return updated ? updated : col;
    });
    this.allColumns.set(allCols);
    
    const columnIds = updatedColumns.map(col => col.id);
    this.columnService.updateColumnOrder(columnIds).subscribe({
      next: (response: JobOfferColumn[]) => {
        console.log('Ordine colonne aggiornato');
      },
      error: (err: any) => {
        console.error('Errore aggiornamento ordine:', err);
        this.loadInitialData();
      }
    });
  }

  isColumnDragging(columnId: number): boolean {
    return this.draggedColumnId() === columnId;
  }

  isColumnDropTarget(columnId: number): boolean {
    return this.dragOverColumnId() === columnId && this.draggedColumnId() !== columnId;
  }

  // Toggle popup opzioni
  toggleTableOptions(): void {
    this.tableOptionsOpen.set(!this.tableOptionsOpen());
  }

  closeTableOptions(): void {
    this.tableOptionsOpen.set(false);
  }

  // Toggle visibilità colonna
  toggleColumnVisibility(columnId: number, visible: boolean): void {
    if (!visible) {
      const visibleCount = this.allColumns().filter(col => col.visible).length;
      if (visibleCount <= 1) return;
    }

    const columns = this.allColumns().map(col => 
      col.id === columnId ? { ...col, visible } : col
    );
    this.allColumns.set(columns);

    this.columnService.updateVisibility(columnId, visible).subscribe({
      error: (err: any) => {
        console.error('Errore aggiornamento visibilità:', err);
        this.loadInitialData();
      }
    });
  }

  isColumnCheckboxDisabled(columnId: number): boolean {
    const column = this.allColumns().find(col => col.id === columnId);
    if (!column?.visible) return false;
    
    const visibleCount = this.allColumns().filter(col => col.visible).length;
    return visibleCount <= 1;
  }

  /**
   * Estrae il valore numerico medio da una stringa di stipendio
   * es. "30.000 - 50.000 EUR" → 40000
   */
  private extractSalaryNumber(salaryStr?: string): number | null {
    if (!salaryStr || salaryStr === 'Non specificato' || salaryStr === 'N/A') {
      return null;
    }

    // Cerca numeri nel formato "30.000 - 50.000" o "30000 - 50000"
    const numbers = salaryStr.match(/\d+\.?\d*/g);
    if (!numbers || numbers.length === 0) return null;

    // Converti e rimuovi separatori
    const cleaned = numbers.map(n => parseFloat(n.replace(/\./g, '')));
    
    // Se ci sono 2 numeri (min-max), fai la media
    if (cleaned.length >= 2) {
      return (cleaned[0] + cleaned[1]) / 2;
    }
    
    // Altrimenti ritorna il singolo valore
    return cleaned[0];
  }
}

