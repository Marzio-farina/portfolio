import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
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
  private marker: google.maps.marker.AdvancedMarkerElement | null = null;
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
    this.initializeGoogleMaps();
  }

  ngOnDestroy(): void {
    // Google Maps si pulisce automaticamente
    this.map = null;
    this.marker = null;
  }

  private async initializeGoogleMaps(): Promise<void> {
    try {
      // Carica l'API di Google Maps direttamente
      if (!window.google) {
        await this.loadGoogleMapsScript();
      }

      // Attendi che l'API sia completamente caricata
      await this.waitForGoogleMaps();

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

      // Aggiungi marker usando AdvancedMarkerElement (nuova API)
      this.marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map: this.map,
        title: 'San Valentino Torio'
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
      
      // Mostra messaggio di errore specifico per API key
      if (error instanceof Error && error.message.includes('InvalidKey')) {
        console.error('❌ API Key di Google Maps non valida o non abilitata per questo dominio');
        console.error('🔧 Verifica che l\'API key sia corretta e abilitata per Maps JavaScript API');
        console.error('🌐 Assicurati che il dominio localhost sia autorizzato nella console di Google Cloud');
      }
      
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

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve();
        return;
      }

      // Verifica che l'API key sia valida
      if (!environment.googleMapsApiKey || environment.googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
        reject(new Error('API key di Google Maps non configurata'));
        return;
      }

      // Messaggio informativo per chiave temporanea
      console.warn('⚠️ ATTENZIONE: Stai usando una chiave temporanea (SerpAPI)');
      console.warn('🔧 Per funzionare correttamente, hai bisogno di una Google Maps API Key');
      console.warn('📋 Vai su https://console.cloud.google.com/ per ottenere la chiave corretta');

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Errore nel caricamento di Google Maps'));
      
      document.head.appendChild(script);
    });
  }

  private waitForGoogleMaps(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps && window.google.maps.MapTypeId) {
          resolve();
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      
      // Timeout dopo 10 secondi
      setTimeout(() => {
        reject(new Error('Timeout nel caricamento di Google Maps'));
      }, 10000);
      
      checkGoogleMaps();
    });
  }

}
