import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import * as L from 'leaflet';

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
  isLoading = signal(true);
  private themeService = inject(ThemeService);

  constructor() {
    // Effect per ascoltare i cambiamenti del tema effettivo
    effect(() => {
      const effectiveTheme = this.themeService.effectiveTheme();
      this.isDarkMode.set(effectiveTheme === 'dark');
      if (this.map) {
        this.applyTheme();
      }
    });
  }

  ngAfterViewInit(): void {
    this.configureLeafletIcons();
    this.initializeMap();
    this.checkTheme();
  }

  private configureLeafletIcons(): void {
    // Configura il percorso delle icone di Leaflet
    const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
    const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
    const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

    // Crea l'icona personalizzata
    const DefaultIcon = L.Icon.extend({
      options: {
        iconRetinaUrl: iconRetinaUrl,
        iconUrl: iconUrl,
        shadowUrl: shadowUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }
    });

    // Imposta l'icona di default
    L.Marker.prototype.options.icon = new DefaultIcon();
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
    
    // Inizializza la mappa con opzioni ottimizzate
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true, // Usa canvas per performance migliori
      zoomSnap: 0.5,
      zoomDelta: 0.5
    }).setView([lat, lng], 13);
    
    // Configura il layer con opzioni di performance
    const tileLayerOptions = {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 1,
      subdomains: ['a', 'b', 'c'], // Usa subdomains per parallelizzare le richieste
      keepBuffer: 2, // Mantieni tile in buffer
      updateWhenIdle: false, // Aggiorna immediatamente
      updateWhenZooming: false, // Non aggiornare durante zoom
      updateInterval: 200, // Intervallo di aggiornamento più frequente
      zIndex: 1
    };
    
    // Aggiungi il layer OpenStreetMap con CDN più veloce
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', tileLayerOptions).addTo(this.map);
    
    // Aggiungi marker
    this.marker = L.marker([lat, lng]).addTo(this.map);
    this.marker.bindPopup('<b>San Valentino Torio</b><br>Italia').openPopup();
    
    // Ascolta il caricamento dei tile
    this.map.on('tileload', () => {
      this.isLoading.set(false);
    });
    
    // Prefetch tile per l'area circostante
    this.prefetchNearbyTiles();
    
    // Applica il tema
    this.applyTheme();
    
    // Timeout di sicurezza per nascondere il loading
    setTimeout(() => {
      this.isLoading.set(false);
    }, 3000);
  }

  private prefetchNearbyTiles(): void {
    // Prefetch tile per zoom levels 12, 13, 14 per migliorare la performance
    const center = this.map.getCenter();
    const prefetchZoom = [12, 13, 14];
    
    prefetchZoom.forEach(zoom => {
      const bounds = this.map.getBounds();
      const tileSize = 256;
      const zoomFactor = Math.pow(2, zoom);
      
      // Calcola i tile da prefetchare
      const north = Math.floor((90 - bounds.getNorth()) * zoomFactor / 360);
      const south = Math.ceil((90 - bounds.getSouth()) * zoomFactor / 360);
      const west = Math.floor((bounds.getWest() + 180) * zoomFactor / 360);
      const east = Math.ceil((bounds.getEast() + 180) * zoomFactor / 360);
      
      // Prefetch tile in background
      for (let x = west; x <= east; x++) {
        for (let y = north; y <= south; y++) {
          const tileUrl = `https://a.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
          this.prefetchTile(tileUrl);
        }
      }
    });
  }

  private prefetchTile(url: string): void {
    // Prefetch tile in background senza bloccare l'UI
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Tile caricato, ora è in cache del browser
    };
    img.onerror = () => {
      // Ignora errori di prefetch
    };
    img.src = url;
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
    
    // Opzioni ottimizzate per performance
    const tileLayerOptions = {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 1,
      subdomains: ['a', 'b', 'c'],
      keepBuffer: 2,
      updateWhenIdle: false,
      updateWhenZooming: false,
      updateInterval: 200,
      zIndex: 1
    };
    
    // Aggiungi layer con tema appropriato
    if (this.isDarkMode()) {
      // Tema scuro - usa CDN più veloce
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        ...tileLayerOptions,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(this.map);
    } else {
      // Tema chiaro - usa CDN più veloce
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', tileLayerOptions).addTo(this.map);
    }
  }

}
