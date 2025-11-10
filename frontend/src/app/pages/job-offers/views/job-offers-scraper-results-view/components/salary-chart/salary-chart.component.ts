import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ScrapedJob } from '../../../../../../services/job-scraper.service';

// Registra i componenti Chart.js
Chart.register(...registerables);

/**
 * Componente per visualizzare il grafico di distribuzione degli stipendi
 */
@Component({
  selector: 'app-salary-chart',
  standalone: true,
  templateUrl: './salary-chart.component.html',
  styleUrl: './salary-chart.component.css'
})
export class SalaryChartComponent implements AfterViewInit, OnChanges {
  @Input() scrapedJobs: ScrapedJob[] = [];
  @Input() currencySymbol: string = '€';
  @Input() minSalary: number | null = null;
  @Input() maxSalary: number | null = null;
  @Input() salaryRange: { min: number; max: number } = { min: 0, max: 100000 };
  
  @ViewChild('salaryDistributionChart') salaryChartCanvas?: ElementRef<HTMLCanvasElement>;
  
  private salaryChart?: Chart;
  
  hasData = signal<boolean>(false);

  ngAfterViewInit(): void {
    // Crea il grafico dopo che il canvas è stato renderizzato
    setTimeout(() => this.updateChart(), 250);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Aggiorna il grafico quando cambiano i dati
    if ((changes['scrapedJobs'] || changes['currencySymbol'] || changes['minSalary'] || changes['maxSalary']) && this.salaryChart) {
      setTimeout(() => this.updateChart(), 100);
    }
  }

  /**
   * Estrae il valore numerico medio da una stringa di stipendio
   */
  private extractSalaryNumber(salaryStr?: string): number | null {
    if (!salaryStr || salaryStr === 'Non specificato' || salaryStr === 'N/A') {
      return null;
    }

    const numbers = salaryStr.match(/\d+\.?\d*/g);
    if (!numbers || numbers.length === 0) return null;

    const cleaned = numbers.map(n => parseFloat(n.replace(/\./g, '')));
    
    if (cleaned.length >= 2) {
      return (cleaned[0] + cleaned[1]) / 2;
    }
    
    return cleaned[0];
  }

  /**
   * Aggiorna o crea il grafico di distribuzione stipendi
   */
  updateChart(): void {
    if (!this.salaryChartCanvas?.nativeElement) {
      return;
    }

    const salaries = this.scrapedJobs
      .map(job => this.extractSalaryNumber(job.salary))
      .filter(s => s !== null) as number[];

    if (salaries.length === 0) {
      this.hasData.set(false);
      if (this.salaryChart) {
        this.salaryChart.destroy();
        this.salaryChart = undefined;
      }
      return;
    }

    this.hasData.set(true);

    // Raggruppa gli stipendi in fasce da 5k
    const bucketSizeFixed = 5000;
    const salaryMap = new Map<number, number>();
    
    salaries.forEach(salary => {
      const bucketStart = Math.floor(salary / bucketSizeFixed) * bucketSizeFixed;
      salaryMap.set(bucketStart, (salaryMap.get(bucketStart) || 0) + 1);
    });

    const buckets = Array.from(salaryMap.entries())
      .map(([bucketStart, count]) => ({
        label: `${Math.round(bucketStart / 1000)}k`,
        count,
        min: bucketStart,
        max: bucketStart + bucketSizeFixed
      }))
      .sort((a, b) => a.min - b.min);

    if (buckets.length === 0) {
      return;
    }

    // Calcola i colori delle barre in base al range selezionato
    const minSelected = this.minSalary !== null ? this.minSalary : this.salaryRange.min;
    const maxSelected = this.maxSalary !== null ? this.maxSalary : this.salaryRange.max;
    
    const barColors = buckets.map(bucket => {
      if (bucket.max <= minSelected || bucket.min >= maxSelected) {
        return 'rgba(203, 213, 225, 0.15)'; // Quasi invisibile
      } else {
        return 'rgba(203, 213, 225, 0.7)'; // Visibile
      }
    });

    const chartData: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: buckets.map(b => b.label),
        datasets: [{
          data: buckets.map(b => b.count),
          backgroundColor: barColors,
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 2,
          barPercentage: 0.9,
          categoryPercentage: 0.9
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 10,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            displayColors: false,
            borderColor: 'rgba(148, 163, 184, 0.5)',
            borderWidth: 1,
            cornerRadius: 6,
            callbacks: {
              title: (items) => {
                const index = items[0].dataIndex;
                const bucket = buckets[index];
                return `${Math.round(bucket.min / 1000)}k - ${Math.round(bucket.max / 1000)}k ${this.currencySymbol}`;
              },
              label: (context) => {
                const count = context.parsed.y;
                return count === 1 ? '📊 1 offerta' : `📊 ${count} offerte`;
              }
            }
          }
        },
        scales: {
          x: {
            display: false,
            grid: { display: false }
          },
          y: {
            display: false,
            grid: { display: false },
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };

    if (this.salaryChart) {
      this.salaryChart.destroy();
    }
    
    this.salaryChart = new Chart(this.salaryChartCanvas.nativeElement, chartData);
  }
}

