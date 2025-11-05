import { Injectable } from '@angular/core';

/**
 * Image Optimization Service
 * 
 * Fornisce utilità per ottimizzare le immagini e migliorare performance (LCP)
 */
@Injectable({
  providedIn: 'root'
})
export class ImageOptimizationService {

  /**
   * Genera un placeholder base64 blur-up per immagini
   * Riduce il Cumulative Layout Shift (CLS)
   */
  generatePlaceholder(width: number, height: number, color: string = '#e5e7eb'): string {
    // Crea un canvas molto piccolo (20x20)
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Riempie con il colore di sfondo
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 20, 20);
    
    // Converti in base64
    return canvas.toDataURL('image/png');
  }

  /**
   * Ottieni dimensioni responsive per srcset
   * Genera URLs per diverse risoluzioni
   */
  getResponsiveSizes(baseUrl: string, widths: number[] = [320, 640, 960, 1280, 1920]): string {
    return widths
      .map(w => `${this.getResizedUrl(baseUrl, w)} ${w}w`)
      .join(', ');
  }

  /**
   * Ottieni URL immagine ridimensionata
   * Per Picsum: aggiungi parametri width/height
   * Per altri: ritorna URL originale (da processare lato backend)
   */
  getResizedUrl(url: string, width: number, height?: number): string {
    if (!url) return url;

    // Se è Picsum, aggiungi parametri di resize
    if (url.includes('picsum.photos')) {
      // Rimuovi eventuali dimensioni esistenti
      const cleanUrl = url.replace(/\/\d+\/\d+/, '');
      const h = height || Math.round(width * 9 / 16); // Aspect ratio 16:9
      return `${cleanUrl}/${width}/${h}`;
    }

    // Per altre sorgenti, ritorna URL originale
    // TODO: implementare resize tramite backend/CDN se necessario
    return url;
  }

  /**
   * Verifica se un'immagine è above-the-fold (visibile immediatamente)
   * Basato sulla posizione dell'elemento nel viewport
   */
  isAboveFold(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // Considera above-the-fold se è nei primi 800px (circa)
    return rect.top < viewportHeight + 100;
  }

  /**
   * Precarica un'immagine critica
   * Utile per LCP element
   */
  preloadImage(url: string): void {
    if (!url) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    
    // Aggiungi al head
    document.head.appendChild(link);
  }

  /**
   * Ottieni formato immagine ottimale basato su supporto browser
   */
  getOptimalFormat(): 'avif' | 'webp' | 'jpeg' {
    // Check AVIF support
    const avifSupport = this.checkFormatSupport('avif');
    if (avifSupport) return 'avif';

    // Check WebP support
    const webpSupport = this.checkFormatSupport('webp');
    if (webpSupport) return 'webp';

    // Fallback JPEG
    return 'jpeg';
  }

  /**
   * Verifica supporto formato immagine
   */
  private checkFormatSupport(format: 'avif' | 'webp'): boolean {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      const mimeType = format === 'avif' ? 'image/avif' : 'image/webp';
      return canvas.toDataURL(mimeType).indexOf(`data:${mimeType}`) === 0;
    }
    return false;
  }

  /**
   * Calcola dimensioni ottimali per un'immagine
   * Basato su DPR (Device Pixel Ratio) e dimensioni container
   */
  getOptimalDimensions(containerWidth: number, containerHeight: number): {
    width: number;
    height: number;
  } {
    const dpr = window.devicePixelRatio || 1;
    
    // Limita DPR a 2 per evitare immagini troppo grandi
    const effectiveDpr = Math.min(dpr, 2);
    
    return {
      width: Math.round(containerWidth * effectiveDpr),
      height: Math.round(containerHeight * effectiveDpr),
    };
  }
}

