import { Injectable } from '@angular/core';
import { Application } from '@splinetool/runtime';

/**
 * Configurazione per modificare un tasto della tastiera Spline
 */
export interface KeyModificationConfig {
  /** Nome del tasto nella scena Spline (es: 'Angular', 'react', 'js') */
  keyName: string;
  
  /** Nuovo colore in formato hex (es: '#dd0031' per Angular) */
  color?: string;
  
  /** URL dell'icona da applicare (SVG/PNG) */
  iconUrl?: string;
  
  /** Se true, rende l'icona bianca (utile per icone colorate su sfondo colorato) */
  whiteIcon?: boolean;
}

/**
 * Service per modificare dinamicamente i tasti della tastiera Spline
 */
@Injectable({
  providedIn: 'root'
})
export class SplineKeyboardService {

  /**
   * Modifica un tasto della tastiera Spline (colore e/o icona)
   * 
   * @param app - Applicazione Spline caricata
   * @param config - Configurazione del tasto da modificare
   * @returns Promise che si risolve quando la modifica è completata
   * 
   * @example
   * ```typescript
   * splineKeyboardService.modifyKey(this.splineApp, {
   *   keyName: 'Angular',
   *   color: '#dd0031',
   *   iconUrl: 'https://cdn.jsdelivr.net/.../angularjs-original.svg',
   *   whiteIcon: true
   * });
   * ```
   */
  async modifyKey(app: Application, config: KeyModificationConfig): Promise<void> {
    if (!app) return;

    const threeScene = (app as any)._scene || (app as any).scene;
    if (!threeScene) return;

    // Cerca il gruppo del tasto nella scena
    let keyGroup: any = null;
    
    const findKey = (obj: any) => {
      if (obj.name === config.keyName) {
        keyGroup = obj;
        return;
      }
      if (obj.children && obj.children.length > 0) {
        obj.children.forEach((child: any) => findKey(child));
      }
    };
    
    findKey(threeScene);

    if (!keyGroup) return;

    let colorsChanged = 0;
    let texturesChanged = 0;
    
    // Naviga i children del tasto e applica le modifiche
    const modifyMaterials = (obj: any) => {
      if (obj.material && obj.material.uniforms) {
        for (let i = 0; i <= 15; i++) {
          const key = `nodeU${i}`;
          const uniform = obj.material.uniforms[key];
          
          if (uniform && uniform.value && typeof uniform.value === 'object') {
            // CAMBIA COLORE (se richiesto)
            if (config.color && 'r' in uniform.value && 'g' in uniform.value && 'b' in uniform.value) {
              const rgb = this.hexToRgb(config.color);
              if (rgb) {
                uniform.value.r = rgb.r;
                uniform.value.g = rgb.g;
                uniform.value.b = rgb.b;
                colorsChanged++;
              }
            }
            
            // CAMBIA TEXTURE/ICONA (se richiesto e se è il legend)
            if (config.iconUrl && obj.name === 'legend' && uniform.value.isTexture) {
              this.replaceTexture(uniform, config.iconUrl, config.whiteIcon || false);
              texturesChanged++;
            }
          }
        }
        
        if (colorsChanged > 0 || texturesChanged > 0) {
          obj.material.needsUpdate = true;
        }
      }
      
      if (obj.children && obj.children.length > 0) {
        obj.children.forEach((child: any) => modifyMaterials(child));
      }
    };

    modifyMaterials(keyGroup);
  }

  /**
   * Converte un colore hex in RGB normalizzato (0-1)
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    // Rimuovi il # se presente
    hex = hex.replace(/^#/, '');
    
    // Converti a RGB
    const num = parseInt(hex, 16);
    
    if (isNaN(num)) return null;
    
    return {
      r: ((num >> 16) & 255) / 255, // Rosso
      g: ((num >> 8) & 255) / 255,  // Verde
      b: (num & 255) / 255          // Blu
    };
  }

  /**
   * Sostituisce la texture di un uniform con una nuova icona
   */
  private replaceTexture(uniform: any, iconUrl: string, whiteIcon: boolean): void {
    const texture = uniform.value;
    
    if (!texture || !texture.isTexture) return;
    
    // Leggi le dimensioni ORIGINALI della texture
    const originalData = texture.source?.data;
    const width = originalData?.width || texture.image?.width || 128;
    const height = originalData?.height || texture.image?.height || 128;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Stesse dimensioni dell'originale
    canvas.width = width;
    canvas.height = height;
    
    // Sfondo trasparente
    ctx.clearRect(0, 0, width, height);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Disegna l'icona centrata
      const size = Math.min(width, height) * 0.8;
      const x = (width - size) / 2;
      const y = (height - size) / 2;
      
      if (whiteIcon) {
        // Per Angular: disegna il logo ORIGINALE (ha già scudo bianco + A rossa)
        // NON applichiamo filtri per preservare i colori originali
        ctx.drawImage(img, x, y, size, size);
      } else {
        // Per altri loghi: disegna normalmente
        ctx.drawImage(img, x, y, size, size);
      }
      
      // Modifica la source della texture
      if (texture.source && texture.source.data) {
        texture.source.data = canvas;
        texture.source.needsUpdate = true;
        texture.needsUpdate = true;
      }
    };
    
    img.onerror = () => {
      // Errore silenzioso per console pulita
    };
    
    img.src = iconUrl;
  }
}

