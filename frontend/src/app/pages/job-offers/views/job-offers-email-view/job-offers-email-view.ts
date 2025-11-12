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

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  editMode = this.editModeService.isEditing;

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
  selectedBcc = signal<'all' | 'with-bcc' | 'without-bcc'>('all');

  // Sorting
  sortColumn = signal<string>('sent_at');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Righe espanse
  expandedRows = signal<Set<number>>(new Set());

  // Popup opzioni tabella
  tableOptionsOpen = signal<boolean>(false);

  // Derived data
  visibleColumns = computed(() =>
    this.allColumns()
      .filter(col => col.visible)
      .sort((a, b) => a.order - b.order)
  );

  filteredEmails = computed(() => {
    const emails = [...this.emails()];
    const query = this.searchQuery().toLowerCase();
    const directionFilter = this.selectedDirection();
    const statusFilter = this.selectedStatus();
    const bccFilter = this.selectedBcc();
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

    // BCC filter
    if (bccFilter === 'with-bcc') {
      result = result.filter(email => email.has_bcc);
    } else if (bccFilter === 'without-bcc') {
      result = result.filter(email => !email.has_bcc);
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

  statsByStatus = computed(() => {
    const emails = this.emails();
    const summary = emails.reduce(
      (acc, email) => {
        acc.total += 1;
        if (email.direction === 'sent') acc.sent += 1;
        if (email.direction === 'received') acc.received += 1;
        if (email.has_bcc) acc.bcc += 1;
        return acc;
      },
      { total: 0, sent: 0, received: 0, bcc: 0 }
    );
    return summary;
  });

  ngOnInit(): void {
    forkJoin({
      columns: this.columnService.getColumns(),
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

  toggleFilters(): void {
    this.filtersVisible.set(!this.filtersVisible());
  }

  showFiltersOnHover(): void {
    if (!this.filtersVisible()) {
      this.filtersVisible.set(true);
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedDirection.set('all');
    this.selectedStatus.set('all');
    this.selectedBcc.set('all');
  }

  goBack(): void {
    const tenantSlug = this.tenantService.userSlug();
    const basePath = tenantSlug ? `/${tenantSlug}/job-offers` : '/job-offers';
    this.router.navigate([basePath]);
  }

  onSort(column: JobOfferEmailColumn): void {
    if (this.sortColumn() === column.fieldName) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column.fieldName);
      this.sortDirection.set(column.fieldName === 'sent_at' ? 'desc' : 'asc');
    }
  }

  toggleColumnVisibility(columnId: string): void {
    const updated = this.allColumns().map(column =>
      column.id === columnId ? { ...column, visible: !column.visible } : column
    );
    this.allColumns.set(updated);
  }

  isColumnVisible(columnId: string): boolean {
    return this.allColumns().find(col => col.id === columnId)?.visible ?? false;
  }

  toggleTableOptions(): void {
    this.tableOptionsOpen.set(!this.tableOptionsOpen());
  }

  closeTableOptions(): void {
    this.tableOptionsOpen.set(false);
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

