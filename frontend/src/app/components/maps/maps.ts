import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { Loader } from '@googlemaps/js-api-loader';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-maps',
  imports: [CommonModule],
  templateUrl: './maps.html',
  styleUrl: './maps.css'
})
export class Maps implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  isDarkMode = signal(false);
  isLoading = signal(true);
  private themeService = inject(ThemeService);
  private loader: Loader | null = null;

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
    this.initializeGoogleMaps();
  }

  ngOnDestroy(): void {
    // Google Maps si pulisce automaticamente
    this.map = null;
    this.marker = null;
  }

  private async initializeGoogleMaps(): Promise<void> {
    try {
      // Inizializza il loader di Google Maps
      this.loader = new Loader({
        apiKey: environment.googleMapsApiKey,
        version: 'weekly',
        libraries: ['places']
      });

      // Carica l'API di Google Maps
      await this.loader.load();

      // Coordinate di San Valentino Torio
      const lat = 40.7894;
      const lng = 14.6019;

      // Inizializza la mappa
      this.map = new google.maps.Map(this.mapContainer.nativeElement, {
        center: { lat, lng },
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        styles: this.getMapStyles()
      });

      // Aggiungi marker
      this.marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: 'San Valentino Torio',
        animation: google.maps.Animation.DROP
      });

      // Aggiungi info window
      const infoWindow = new google.maps.InfoWindow({
        content: '<div class="google-info-window"><b>San Valentino Torio</b><br>Italia</div>'
      });

      this.marker.addListener('click', () => {
        infoWindow.open(this.map, this.marker);
      });

      // Nascondi loading
      this.isLoading.set(false);

    } catch (error) {
      console.error('Errore nel caricamento di Google Maps:', error);
      this.isLoading.set(false);
    }
  }

  private getMapStyles(): google.maps.MapTypeStyle[] {
    if (this.isDarkMode()) {
      // Tema scuro per Google Maps
      return [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#263c3f' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#6b9a76' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#38414e' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#212a37' }]
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9ca5b3' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#746855' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1f2835' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#f3d19c' }]
        },
        {
          featureType: 'transit',
          elementType: 'geometry',
          stylers: [{ color: '#2f3948' }]
        },
        {
          featureType: 'transit.station',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#17263c' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#515c6d' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#17263c' }]
        }
      ];
    } else {
      // Tema chiaro per Google Maps (default)
      return [];
    }
  }

  private applyTheme(): void {
    if (!this.map) return;
    
    // Applica gli stili del tema
    this.map.setOptions({
      styles: this.getMapStyles()
    });
  }

}
