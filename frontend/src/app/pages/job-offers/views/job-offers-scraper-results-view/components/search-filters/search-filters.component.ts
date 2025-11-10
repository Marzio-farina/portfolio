import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalaryChartComponent } from '../salary-chart/salary-chart.component';
import { ScrapedJob } from '../../../../../../services/job-scraper.service';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

/**
 * Componente per i filtri laterali di ricerca
 */
@Component({
  selector: 'app-search-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, SalaryChartComponent],
  templateUrl: './search-filters.component.html',
  styleUrl: './search-filters.component.css'
})
export class SearchFiltersComponent {
  // Dati per il grafico
  @Input() scrapedJobs: ScrapedJob[] = [];
  @Input() salaryRange: { min: number; max: number } = { min: 0, max: 100000 };
  @Input() currencySymbol: string = '€';
  
  // Parametri ricerca base
  @Input() searchKeyword: string = '';
  @Input() searchLocationInput: string = '';
  @Input() resultsLimit: number = 50;
  
  // Filtri avanzati
  @Input() selectedCompany: string = '';
  @Input() selectedEmploymentType: string = '';
  @Input() selectedRemote: string = '';
  @Input() minSalary: number | null = null;
  @Input() maxSalary: number | null = null;
  @Input() selectedCurrency: string = 'EUR';
  @Input() availableCurrencies: Currency[] = [];
  
  // Opzioni disponibili dai risultati
  @Input() availableCompanies: string[] = [];
  @Input() availableEmploymentTypes: string[] = [];
  @Input() availableRemoteTypes: string[] = [];
  
  // Conteggio risultati
  @Input() filteredJobsCount: number = 0;
  
  // Eventi
  @Output() searchKeywordChange = new EventEmitter<string>();
  @Output() searchLocationInputChange = new EventEmitter<string>();
  @Output() resultsLimitChange = new EventEmitter<number>();
  @Output() selectedCompanyChange = new EventEmitter<string>();
  @Output() selectedEmploymentTypeChange = new EventEmitter<string>();
  @Output() selectedRemoteChange = new EventEmitter<string>();
  @Output() minSalaryChange = new EventEmitter<number | null>();
  @Output() maxSalaryChange = new EventEmitter<number | null>();
  @Output() selectedCurrencyChange = new EventEmitter<string>();
  @Output() checkParamsChanged = new EventEmitter<void>();

  onSearchKeywordChange(value: string): void {
    this.searchKeywordChange.emit(value);
    this.checkParamsChanged.emit();
  }

  onSearchLocationChange(value: string): void {
    this.searchLocationInputChange.emit(value);
    this.checkParamsChanged.emit();
  }

  onResultsLimitChange(value: number): void {
    this.resultsLimitChange.emit(value);
    this.checkParamsChanged.emit();
  }

  onCompanyChange(value: string): void {
    this.selectedCompanyChange.emit(value);
    this.checkParamsChanged.emit();
  }

  onEmploymentTypeChange(value: string): void {
    this.selectedEmploymentTypeChange.emit(value);
    this.checkParamsChanged.emit();
  }

  onRemoteChange(value: string): void {
    this.selectedRemoteChange.emit(value);
    this.checkParamsChanged.emit();
  }

  onMinSalaryChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    const currentMax = this.maxSalary !== null ? this.maxSalary : this.salaryRange.max;
    const clampedValue = Math.min(value, currentMax);
    input.value = clampedValue.toString();
    this.minSalaryChange.emit(clampedValue);
  }

  onMaxSalaryChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    const currentMin = this.minSalary !== null ? this.minSalary : this.salaryRange.min;
    const clampedValue = Math.max(value, currentMin);
    input.value = clampedValue.toString();
    this.maxSalaryChange.emit(clampedValue);
  }

  onCurrencyChange(value: string): void {
    this.selectedCurrencyChange.emit(value);
  }

  getSliderRangeLeft(): number {
    const min = this.minSalary !== null ? this.minSalary : this.salaryRange.min;
    const total = this.salaryRange.max - this.salaryRange.min;
    if (total === 0) return 0;
    return ((min - this.salaryRange.min) / total) * 100;
  }

  getSliderRangeWidth(): number {
    const min = this.minSalary !== null ? this.minSalary : this.salaryRange.min;
    const max = this.maxSalary !== null ? this.maxSalary : this.salaryRange.max;
    const total = this.salaryRange.max - this.salaryRange.min;
    if (total === 0) return 100;
    return ((max - min) / total) * 100;
  }
}

