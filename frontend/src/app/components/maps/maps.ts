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
    
    // Inizializza la mappa con opzioni ultra-ottimizzate
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      fadeAnimation: false, // Disabilita animazioni per performance
      zoomAnimation: false, // Disabilita animazioni zoom
      markerZoomAnimation: false, // Disabilita animazioni marker
      maxBounds: [[-90, -180], [90, 180]], // Limita i bounds
      maxBoundsViscosity: 1.0, // Mantieni i bounds
      wheelPxPerZoomLevel: 120, // Velocità scroll wheel
      zoomAnimationThreshold: 4, // Soglia per animazioni zoom
      inertia: true, // Abilita inerzia per scroll fluido
      inertiaDeceleration: 3000, // Decelerazione inerzia
      inertiaMaxSpeed: 1500, // Velocità massima inerzia
      easeLinearity: 0.2, // Linearità delle transizioni
      worldCopyJump: false, // Disabilita salto mondo
      touchZoom: true, // Abilita zoom touch
      doubleClickZoom: true, // Abilita zoom doppio click
      boxZoom: true, // Abilita zoom box
      keyboard: true, // Abilita controlli tastiera
      dragging: true, // Abilita trascinamento
      scrollWheelZoom: true, // Abilita zoom scroll
      bounceAtZoomLimits: false, // Disabilita bounce ai limiti zoom
      className: 'custom-map' // Classe CSS personalizzata
    }).setView([lat, lng], 13);
    
    // Configura il layer con opzioni ultra-performance
    const tileLayerOptions = {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18, // Ridotto per performance
      minZoom: 1,
      subdomains: ['a', 'b', 'c'],
      keepBuffer: 3, // Aumentato per più tile in cache
      updateWhenIdle: false,
      updateWhenZooming: false,
      updateInterval: 100, // Ridotto per aggiornamenti più frequenti
      zIndex: 1,
      tileSize: 256, // Dimensione tile esplicita
      zoomOffset: 0, // Offset zoom
      noWrap: false, // Permetti wrap del mondo
      bounds: undefined, // Nessun bound specifico
      errorTileUrl: '', // Nessuna tile di errore per performance
      zoomReverse: false, // Zoom normale
      detectRetina: true, // Rileva retina per tile HD
      crossOrigin: false, // Disabilita CORS per performance
      referrerPolicy: false, // Disabilita referrer policy
      pane: 'tilePane', // Pane specifico
      className: 'custom-tile-layer' // Classe CSS personalizzata
    };
    
    // Usa un provider più veloce (Stamen)
    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.png', {
      ...tileLayerOptions,
      attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
      subdomains: ['a', 'b', 'c', 'd']
    }).addTo(this.map);
    
    // Aggiungi marker con icona personalizzata più leggera
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="marker-pin"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
    });
    
    this.marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
    this.marker.bindPopup('<b>San Valentino Torio</b><br>Italia', {
      closeButton: true,
      autoClose: true,
      closeOnClick: true,
      className: 'custom-popup'
    }).openPopup();
    
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
    }, 2000); // Ridotto a 2 secondi
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
    
    // Opzioni ultra-ottimizzate per performance
    const tileLayerOptions = {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18, // Ridotto per performance
      minZoom: 1,
      subdomains: ['a', 'b', 'c', 'd'],
      keepBuffer: 3, // Aumentato per più tile in cache
      updateWhenIdle: false,
      updateWhenZooming: false,
      updateInterval: 100, // Ridotto per aggiornamenti più frequenti
      zIndex: 1,
      tileSize: 256,
      zoomOffset: 0,
      noWrap: false,
      bounds: undefined,
      errorTileUrl: '',
      zoomReverse: false,
      detectRetina: true,
      crossOrigin: false,
      referrerPolicy: false,
      pane: 'tilePane',
      className: 'custom-tile-layer'
    };
    
    // Aggiungi layer con tema appropriato usando provider più veloci
    if (this.isDarkMode()) {
      // Tema scuro - usa Stamen Dark
      L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.png', {
        ...tileLayerOptions,
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
      }).addTo(this.map);
    } else {
      // Tema chiaro - usa Stamen Light
      L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.png', {
        ...tileLayerOptions,
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
      }).addTo(this.map);
    }
  }

}
