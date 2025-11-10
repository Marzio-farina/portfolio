import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobOfferColumn } from '../../../../../../services/job-offer-column.service';

/**
 * Componente per il popup delle opzioni della tabella
 */
@Component({
  selector: 'app-table-options-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-options-popup.component.html',
  styleUrl: './table-options-popup.component.css'
})
export class TableOptionsPopupComponent {
  @Input() allColumns: JobOfferColumn[] = [];
  @Input() tableOptionsOpen: boolean = false;
  
  @Output() closePopup = new EventEmitter<void>();
  @Output() toggleVisibility = new EventEmitter<{ columnId: number; visible: boolean }>();

  onClosePopup(): void {
    this.closePopup.emit();
  }

  onToggleVisibility(column: JobOfferColumn): void {
    this.toggleVisibility.emit({ columnId: column.id, visible: !column.visible });
  }

  isColumnCheckboxDisabled(column: JobOfferColumn): boolean {
    // Colonne sempre disabilitate (non rilevanti per offerte scrapate)
    if (column.field_name === 'website') return true;
    if (column.field_name === 'status') return true;
    if (column.field_name === 'is_registered') return true;
    
    if (!column.visible) return false;
    
    // Conta solo le colonne visibili escluso quelle sempre nascoste
    const hiddenFields = ['website', 'status', 'is_registered'];
    const visibleCount = this.allColumns.filter(col => 
      col.visible && !hiddenFields.includes(col.field_name)
    ).length;
    return visibleCount <= 1;
  }

  isColumnChecked(column: JobOfferColumn): boolean {
    // Colonne sempre checked o unchecked
    if (column.field_name === 'website') return true;
    if (column.field_name === 'status') return false;
    if (column.field_name === 'is_registered') return false;
    
    return column.visible ?? false;
  }
}

