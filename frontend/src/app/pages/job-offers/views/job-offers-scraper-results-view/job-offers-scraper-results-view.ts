import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobOfferColumnService, JobOfferColumn } from '../../../../services/job-offer-column.service';
import { JobScraperService, ScrapedJob } from '../../../../services/job-scraper.service';
import { JobOfferService } from '../../../../services/job-offer.service';
import { EditModeService } from '../../../../services/edit-mode.service';
import { TenantService } from '../../../../services/tenant.service';
import { NotificationService } from '../../../../services/notification.service';
import { Notification } from '../../../../components/notification/notification';

/**
 * Componente per visualizzare i risultati dello scraping
 * Usa la stessa struttura di job-offers-stats-view ma con dati da Adzuna
 */
@Component({
  selector: 'app-job-offers-scraper-results-view',
  standalone: true,
  imports: [CommonModule, FormsModule, Notification],
  providers: [NotificationService],
  templateUrl: './job-offers-scraper-results-view.html',
  styleUrl: './job-offers-scraper-results-view.css'
})
export class JobOffersScraperResultsView implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private columnService = inject(JobOfferColumnService);
  private scraperService = inject(JobScraperService);
  private jobOfferService = inject(JobOfferService);
  private editModeService = inject(EditModeService);
  private tenantService = inject(TenantService);
  protected notificationService = inject(NotificationService);
  
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
  selectedEmploymentType = signal<string>('');
  selectedRemote = signal<string>('');
  selectedCompany = signal<string>('');
  selectedSalaryFilter = signal<string>('all'); // 'all', 'with', 'without'
  minSalary = signal<number | null>(null);
  maxSalary = signal<number | null>(null);
  
  // Parametri ricerca Adzuna
  searchKeyword = signal<string>('');
  searchLocationInput = signal<string>('');
  resultsLimit = signal<number>(50);
  
  // Flag per tracciare se è stata fatta almeno una ricerca
  hasPerformedSearch = signal<boolean>(false);
  
  // Snapshot parametri ricerca dell'ultima chiamata API
  lastSearchParams = signal<{
    keyword: string;
    location: string;
    limit: number;
    company: string;
    employmentType: string;
    remote: string;
    salaryFilter: string;
    minSalary: number | null;
    maxSalary: number | null;
  } | null>(null);
  
  // Verifica se i parametri di ricerca sono cambiati (TUTTI i filtri triggerano notifica)
  searchParamsChanged = computed(() => {
    const last = this.lastSearchParams();
    if (!last || this.scrapedJobs().length === 0) return false;
    
    return (
      this.searchKeyword() !== last.keyword ||
      this.searchLocationInput() !== last.location ||
      this.resultsLimit() !== last.limit ||
      this.selectedCompany() !== last.company ||
      this.selectedEmploymentType() !== last.employmentType ||
      this.selectedRemote() !== last.remote ||
      this.selectedSalaryFilter() !== last.salaryFilter ||
      this.minSalary() !== last.minSalary ||
      this.maxSalary() !== last.maxSalary
    );
  });
  
  constructor() {
    // Nessun effect necessario - i filtri avanzati filtrano solo lato frontend
  }
  
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
      limit: this.resultsLimit(),
      company: this.selectedCompany(),
      employmentType: this.selectedEmploymentType(),
      remote: this.selectedRemote()
    });
    
    this.loading.set(true);
    
    // Nascondi i filtri dopo aver avviato la ricerca
    this.filtersVisible.set(false);
    
    // Marca che è stata fatta la prima ricerca
    this.hasPerformedSearch.set(true);
    
    const params = {
      keyword: keyword,
      location: this.searchLocationInput() || 'Italia',
      limit: this.resultsLimit(),
      company: this.selectedCompany(),
      employment_type: this.selectedEmploymentType(),
      remote: this.selectedRemote(),
      salary_filter: this.selectedSalaryFilter(),
      min_salary: this.minSalary(),
      max_salary: this.maxSalary()
    };

    this.scraperService.scrapeAdzuna(params).subscribe({
      next: (response) => {
        console.log('✅ Adzuna scraping completato:', response);
        console.log(`📊 Trovate ${response.count} offerte:`, response.jobs);
        this.scrapedJobs.set(response.jobs);
        
        // Salva snapshot parametri ricerca per rilevare modifiche future
        this.lastSearchParams.set({
          keyword: keyword,
          location: this.searchLocationInput(),
          limit: this.resultsLimit(),
          company: this.selectedCompany(),
          employmentType: this.selectedEmploymentType(),
          remote: this.selectedRemote(),
          salaryFilter: this.selectedSalaryFilter(),
          minSalary: this.minSalary(),
          maxSalary: this.maxSalary()
        });
        
        // Rimuovi la notifica di parametri modificati
        this.notificationService.remove('search-params-changed');
        
        // Salva le offerte scrapate nella tabella job_offers con status 'search'
        this.saveJobsToDatabase(response.jobs);
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Errore scraping:', err);
        this.loading.set(false);
      }
    });
  }


  // Colonne visibili (filtrate e ordinate, escluso website/status/is_registered)
  // - 'website' gestito dalla colonna "Candidati"
  // - 'status' e 'is_registered' non rilevanti per offerte scrapate
  visibleColumns = computed(() => {
    return this.allColumns()
      .filter(col => 
        col.visible && 
        col.field_name !== 'website' && 
        col.field_name !== 'status' && 
        col.field_name !== 'is_registered'
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  // Tutte le colonne per il popup (include 'website' ma sempre checked e disabled)
  allColumnsForPopup = computed(() => {
    return this.allColumns().sort((a, b) => (a.order || 0) - (b.order || 0));
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

  /**
   * Filtra le colonne extra per un dato job, mostrando solo quelle con valore
   */
  getPopulatedExtraColumns(job: ScrapedJob): JobOfferColumn[] {
    return this.extraColumns().filter(column => {
      const value = this.getFieldValue(job, column.field_name);
      // Mostra solo se ha un valore valido (non null, undefined, stringa vuota, 'N/A')
      return value !== null && 
             value !== undefined && 
             value !== '' && 
             value !== 'N/A' &&
             value !== 'Non specificato';
    });
  }

  /**
   * Salva le offerte scrapate nella tabella job_offers con status 'search'
   */
  private saveJobsToDatabase(jobs: ScrapedJob[]): void {
    const jobsToSave = jobs.map(job => ({
      company: job.company,
      title: job.title,
      location: job.location,
      url: job.url,
      salary: job.salary,
      employment_type: job.employment_type,
      remote: job.remote
    }));

    this.jobOfferService.saveScrapedJobs(jobsToSave).subscribe({
      next: (response) => {
        console.log(`💾 Salvate ${response.saved_count} nuove offerte nel database`);
      },
      error: (err) => {
        console.error('❌ Errore salvataggio offerte:', err);
      }
    });
  }

  // Offerte filtrate e ordinate
  filteredJobs = computed(() => {
    let jobs = this.scrapedJobs();
    const query = this.searchQuery().toLowerCase();
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

    // Filtra per azienda (testo parziale)
    if (company && company.trim() !== '') {
      jobs = jobs.filter(job => 
        job.company.toLowerCase().includes(company.toLowerCase())
      );
    }

    // Filtra per employment type
    if (employmentType && employmentType.trim() !== '') {
      jobs = jobs.filter(job => job.employment_type === employmentType);
    }

    // Filtra per remote
    if (remote && remote.trim() !== '') {
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

  // Valori unici disponibili dai risultati (per popolare i filtri)
  availableCompanies = computed(() => {
    const companies = new Set(
      this.scrapedJobs()
        .map(job => job.company)
        .filter(comp => comp && comp !== 'N/A')
    );
    return Array.from(companies).sort();
  });

  availableEmploymentTypes = computed(() => {
    const types = new Set(
      this.scrapedJobs()
        .map(job => job.employment_type)
        .filter(type => type && type !== 'N/A')
    );
    return Array.from(types).sort();
  });

  availableRemoteTypes = computed(() => {
    const types = new Set(
      this.scrapedJobs()
        .map(job => job.remote)
        .filter(type => type && type !== 'N/A')
    );
    return Array.from(types).sort();
  });

  // Verifica se un filtro ha opzioni disponibili
  hasAvailableCompanies = computed(() => this.availableCompanies().length > 0);
  hasAvailableEmploymentTypes = computed(() => this.availableEmploymentTypes().length > 0);
  hasAvailableRemoteTypes = computed(() => this.availableRemoteTypes().length > 0);
  
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
    this.selectedEmploymentType.set('');
    this.selectedRemote.set('');
    this.selectedCompany.set('');
    this.selectedSalaryFilter.set('all');
    this.minSalary.set(null);
    this.maxSalary.set(null);
    
    // Pulisci risultati e snapshot parametri
    this.scrapedJobs.set([]);
    this.lastSearchParams.set(null);
    this.hasPerformedSearch.set(false);
    
    // Mostra i filtri se erano nascosti
    this.filtersVisible.set(true);
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
   * Apre il link dell'offerta in una nuova finestra/tab
   */
  openJobUrl(url: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
    
    // Colonne sempre disabilitate (non rilevanti per offerte scrapate)
    if (column?.field_name === 'website') return true;      // Gestito dalla colonna Candidati
    if (column?.field_name === 'status') return true;       // Status non applicabile a ricerche
    if (column?.field_name === 'is_registered') return true; // Registrazione non applicabile
    
    if (!column?.visible) return false;
    
    // Conta solo le colonne visibili escluso quelle sempre nascoste
    const hiddenFields = ['website', 'status', 'is_registered'];
    const visibleCount = this.allColumns().filter(col => 
      col.visible && !hiddenFields.includes(col.field_name)
    ).length;
    return visibleCount <= 1; // Disabilita se è l'unica visibile
  }

  // Verifica se una checkbox deve essere checked
  isColumnChecked(column: JobOfferColumn): boolean {
    // Colonne sempre unchecked (non rilevanti per offerte scrapate)
    if (column.field_name === 'website') return true;       // Gestito dalla colonna Candidati
    if (column.field_name === 'status') return false;       // Status non applicabile
    if (column.field_name === 'is_registered') return false; // Registrazione non applicabile
    
    return column.visible ?? false;
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

  /**
   * Ottiene la notifica più grave per l'icona nell'angolo
   */
  getMostSevereNotification() {
    return this.notificationService.getMostSevere();
  }

  /**
   * Mostra la notifica se i parametri di ricerca sono cambiati in modo NON restrittivo
   * (solo se cercano valori non presenti nei risultati attuali)
   */
  checkAndShowParamsChangedNotification(): void {
    const last = this.lastSearchParams();
    
    // Se non ci sono ancora risultati, non mostrare notifica
    if (!last || this.scrapedJobs().length === 0) {
      return;
    }
    
    // Verifica se i parametri BASE sono cambiati (sempre triggerano notifica)
    const baseParamsChanged = 
      this.searchKeyword() !== last.keyword ||
      this.searchLocationInput() !== last.location ||
      this.resultsLimit() !== last.limit;
    
    if (baseParamsChanged) {
      this.notificationService.add(
        'warning',
        'Parametri di ricerca modificati. Clicca su "Aggiorna Ricerca"',
        'search-params-changed',
        false,
        true
      );
      return;
    }
    
    // Verifica se i filtri AVANZATI sono cambiati in modo NON restrittivo
    let needsApiCall = false;
    
    // Controlla Azienda
    const company = this.selectedCompany().trim();
    if (company !== last.company) {
      // Se rimuove un'azienda precedentemente cercata (amplia la ricerca)
      if (!company && last.company) {
        needsApiCall = true;
      } else if (company) {
        // Se l'azienda cercata NON è nei risultati attuali, serve nuova ricerca
        const availableCompanies = this.availableCompanies();
        if (!availableCompanies.some(c => c.toLowerCase().includes(company.toLowerCase()))) {
          needsApiCall = true;
        }
      }
    }
    
    // Controlla Tipo Contratto
    const employmentType = this.selectedEmploymentType();
    if (employmentType !== last.employmentType) {
      // Se passa a "Tutti" (stringa vuota) da un valore specifico, serve nuova ricerca
      if (!employmentType && last.employmentType) {
        needsApiCall = true;
      } else if (employmentType) {
        // Se seleziona un valore specifico che NON è nei risultati
        const availableTypes = this.availableEmploymentTypes();
        if (!availableTypes.includes(employmentType)) {
          needsApiCall = true;
        }
      }
    }
    
    // Controlla Modalità Lavoro
    const remote = this.selectedRemote();
    if (remote !== last.remote) {
      // Se passa a "Tutte" (stringa vuota) da un valore specifico, serve nuova ricerca
      if (!remote && last.remote) {
        needsApiCall = true;
      } else if (remote) {
        // Se seleziona un valore specifico che NON è nei risultati
        const availableRemote = this.availableRemoteTypes();
        if (!availableRemote.includes(remote)) {
          needsApiCall = true;
        }
      }
    }
    
    // Controlla Stipendio (con/senza)
    const salaryFilter = this.selectedSalaryFilter();
    if (salaryFilter !== last.salaryFilter) {
      // Se passa a "Tutti" da un filtro specifico, serve nuova ricerca
      if (salaryFilter === 'all' && last.salaryFilter !== 'all') {
        needsApiCall = true;
      } else if (salaryFilter !== 'all') {
        // Se seleziona un filtro specifico diverso da quello precedente
        needsApiCall = true;
      }
    }
    
    // Controlla Range Stipendio
    const minSal = this.minSalary();
    const maxSal = this.maxSalary();
    if (minSal !== last.minSalary || maxSal !== last.maxSalary) {
      // Se rimuove un range precedentemente impostato (amplia la ricerca)
      if ((minSal === null && last.minSalary !== null) || (maxSal === null && last.maxSalary !== null)) {
        needsApiCall = true;
      } else if (minSal !== null || maxSal !== null) {
        // Verifica se il range richiesto è al di fuori dei risultati attuali
        const salariesInResults = this.scrapedJobs()
          .map(job => this.extractSalaryNumber(job.salary))
          .filter(s => s !== null) as number[];
        
        if (salariesInResults.length > 0) {
          const currentMin = Math.min(...salariesInResults);
          const currentMax = Math.max(...salariesInResults);
          
          // Se cerca salari fuori dal range attuale, serve nuova ricerca
          if ((minSal !== null && minSal < currentMin) || (maxSal !== null && maxSal > currentMax)) {
            needsApiCall = true;
          }
        }
      }
    }
    
    if (needsApiCall) {
      this.notificationService.add(
        'warning',
        'Parametri di ricerca modificati. Clicca su "Aggiorna Ricerca"',
        'search-params-changed',
        false,
        true
      );
    } else {
      this.notificationService.remove('search-params-changed');
    }
  }
}

