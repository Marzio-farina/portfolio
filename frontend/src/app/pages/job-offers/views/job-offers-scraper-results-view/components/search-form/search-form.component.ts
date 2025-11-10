import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Componente per il form di ricerca superiore con pulsanti e search bar
 */
@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-form.component.html',
  styleUrl: './search-form.component.css'
})
export class SearchFormComponent {
  @Input() filtersVisible: boolean = false;
  @Input() isHistoryMode: boolean = false;
  @Input() searchQuery: string = '';
  @Input() searchKeyword: string = '';
  @Input() loading: boolean = false;
  @Input() searchParamsChanged: boolean = false;
  
  @Output() performSearch = new EventEmitter<void>();
  @Output() resetFilters = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();

  onSearchQueryChange(value: string): void {
    this.searchQueryChange.emit(value);
  }

  onPerformSearch(): void {
    this.performSearch.emit();
  }

  onResetFilters(): void {
    this.resetFilters.emit();
  }

  clearSearchQuery(): void {
    this.searchQueryChange.emit('');
  }
}

