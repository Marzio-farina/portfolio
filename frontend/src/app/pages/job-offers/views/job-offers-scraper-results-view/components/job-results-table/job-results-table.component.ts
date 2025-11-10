import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableOptionsPopupComponent } from '../table-options-popup/table-options-popup.component';
import { JobOfferColumn } from '../../../../../../services/job-offer-column.service';
import { ScrapedJob } from '../../../../../../services/job-scraper.service';

/**
 * Componente per la tabella dei risultati delle offerte di lavoro
 */
@Component({
  selector: 'app-job-results-table',
  standalone: true,
  imports: [CommonModule, TableOptionsPopupComponent],
  templateUrl: './job-results-table.component.html',
  styleUrl: './job-results-table.component.css'
})
export class JobResultsTableComponent {
  @Input() filteredJobs: ScrapedJob[] = [];
  @Input() allColumns: JobOfferColumn[] = [];
  @Input() mainColumns: JobOfferColumn[] = [];
  @Input() loading: boolean = false;
  @Input() editMode: boolean = false;
  @Input() sortColumn: string | null = null;
  @Input() sortDirection: 'asc' | 'desc' = 'asc';
  @Input() expandedRows: Set<string> = new Set();
  @Input() draggedColumnId: number | null = null;
  @Input() dragOverColumnId: number | null = null;
  @Input() tableOptionsOpen: boolean = false;
  
  @Output() columnSort = new EventEmitter<string>();
  @Output() rowExpansion = new EventEmitter<string>();
  @Output() openJobUrl = new EventEmitter<string>();
  @Output() dragStart = new EventEmitter<{ event: DragEvent; columnId: number }>();
  @Output() dragOver = new EventEmitter<{ event: DragEvent; columnId: number }>();
  @Output() dragLeave = new EventEmitter<DragEvent>();
  @Output() drop = new EventEmitter<{ event: DragEvent; columnId: number }>();
  @Output() dragEnd = new EventEmitter<void>();
  @Output() toggleTableOptions = new EventEmitter<void>();
  @Output() closeTableOptions = new EventEmitter<void>();
  @Output() toggleColumnVisibility = new EventEmitter<{ columnId: number; visible: boolean }>();

  skeletonRows = Array.from({ length: 8 }, (_, i) => i);

  hasExtraColumns(): boolean {
    return this.getExtraColumns().length > 0;
  }

  getExtraColumns(): JobOfferColumn[] {
    const mainIds = this.mainColumns.map(col => col.id);
    return this.allColumns
      .filter(col => 
        col.visible && 
        !mainIds.includes(col.id) &&
        col.field_name !== 'website' && 
        col.field_name !== 'status' && 
        col.field_name !== 'is_registered'
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getPopulatedExtraColumns(job: ScrapedJob): JobOfferColumn[] {
    return this.getExtraColumns().filter(column => {
      const value = this.getFieldValue(job, column.field_name);
      return value !== null && 
             value !== undefined && 
             value !== '' && 
             value !== 'N/A' &&
             value !== 'Non specificato';
    });
  }

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
      'recruiter_company': null,
      'application_date': null,
      'is_registered': false,
      'status': 'pending'
    };
    
    return mapping[fieldName] ?? null;
  }

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

  private formatWorkMode(employmentType?: string, remote?: string): string {
    const parts = [];
    if (employmentType) parts.push(employmentType);
    if (remote && remote !== 'N/A') parts.push(remote);
    return parts.join(' - ') || 'Non specificato';
  }

  isRowExpanded(jobId: string): boolean {
    return this.expandedRows.has(jobId);
  }

  toggleRowExpansion(jobId: string): void {
    this.rowExpansion.emit(jobId);
  }

  onColumnSort(fieldName: string): void {
    if (!this.editMode) {
      this.columnSort.emit(fieldName);
    }
  }

  onOpenJobUrl(url: string): void {
    this.openJobUrl.emit(url);
  }

  onDragStart(event: DragEvent, columnId: number): void {
    if (this.editMode) {
      this.dragStart.emit({ event, columnId });
    }
  }

  onDragOver(event: DragEvent, columnId: number): void {
    if (this.editMode) {
      this.dragOver.emit({ event, columnId });
    }
  }

  onDragLeave(event: DragEvent): void {
    if (this.editMode) {
      this.dragLeave.emit(event);
    }
  }

  onDrop(event: DragEvent, columnId: number): void {
    if (this.editMode) {
      this.drop.emit({ event, columnId });
    }
  }

  onDragEnd(): void {
    this.dragEnd.emit();
  }

  isColumnDragging(columnId: number): boolean {
    return this.draggedColumnId === columnId;
  }

  isColumnDropTarget(columnId: number): boolean {
    return this.dragOverColumnId === columnId && this.draggedColumnId !== columnId;
  }

  onToggleTableOptions(): void {
    this.toggleTableOptions.emit();
  }

  onCloseTableOptions(): void {
    this.closeTableOptions.emit();
  }

  onToggleColumnVisibility(data: { columnId: number; visible: boolean }): void {
    this.toggleColumnVisibility.emit(data);
  }
}

