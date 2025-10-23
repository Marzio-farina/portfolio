import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

declare var L: any;

@Component({
  selector: 'app-maps',
  imports: [CommonModule],
  templateUrl: './maps.html',
  styleUrl: './maps.css'
})
export class Maps implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  
  private map: any;
  private marker: any;
  isDarkMode = signal(false);
  private themeService = inject(ThemeService);

  ngAfterViewInit(): void {
    this.initializeMap();
    this.checkTheme();
    
    // Ascolta i cambiamenti del tema
    this.themeService.theme$.subscribe(() => {
      this.updateTheme();
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap(): void {
    // Coordinate di San Valentino Torio
    const lat = 40.7894;
    const lng = 14.6019;
    
    // Inizializza la mappa
    this.map = L.map(this.mapContainer.nativeElement).setView([lat, lng], 13);
    
    // Aggiungi il layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);
    
    // Aggiungi marker
    this.marker = L.marker([lat, lng]).addTo(this.map);
    this.marker.bindPopup('<b>San Valentino Torio</b><br>Italia').openPopup();
    
    // Applica il tema
    this.applyTheme();
  }

  private checkTheme(): void {
    // Controlla se è dark mode
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                   (!document.documentElement.getAttribute('data-theme') && 
                    window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    this.isDarkMode.set(isDark);
    this.applyTheme();
  }

  private applyTheme(): void {
    if (!this.map) return;
    
    // Rimuovi layer precedente
    this.map.eachLayer((layer: any) => {
      if (layer._url) {
        this.map.removeLayer(layer);
      }
    });
    
    // Aggiungi layer con tema appropriato
    if (this.isDarkMode()) {
      // Tema scuro
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(this.map);
    } else {
      // Tema chiaro
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.map);
    }
  }

  // Metodo per cambiare tema (chiamato dal servizio tema)
  updateTheme(): void {
    this.checkTheme();
  }
}
