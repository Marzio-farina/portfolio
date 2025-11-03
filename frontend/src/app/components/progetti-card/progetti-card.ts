import { Component, ElementRef, input, ViewChild, signal, inject, effect, computed, output, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { ProjectService } from '../../services/project.service';

import { Progetto } from '../../core/models/project';

export type { Progetto };

@Component({
  selector: 'app-progetti-card',
  imports: [],
  templateUrl: './progetti-card.html',
  styleUrl: './progetti-card.css'
})
export class ProgettiCard {
  progetto = input.required<Progetto>();
  @ViewChild('videoEl', { static: false }) videoEl?: ElementRef<HTMLVideoElement>;
  private readonly themeService = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly editModeService = inject(EditModeService);
  private readonly api = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  
  isAuthenticated = computed(() => this.auth.isAuthenticated());
  isEditing = computed(() => this.editModeService.isEditing());
  
  deleted = output<number>();
  deletedError = output<{ id: number; error: any }>();
  clicked = output<Progetto>();
  categoryChanged = output<Progetto>();
  
  // Lista categorie per la select (passata dal parent)
  categories = input<Array<{ id: number; title: string }>>([]);
  changingCategory = signal(false);

  // Valori randomici per hover, generati al mount
  hoverRotate = signal<string>('0deg');
  hoverTranslate = signal<string>('-3px');
  hoverScale = signal<number>(1.0);
  hoverShadow = signal<string>('0 6px 18px rgba(0,0,0,.25)');
  hoverMetaBackgroundColor = signal<string>('transparent');
  radialGradientColor = signal<string>('transparent'); // Colore per il gradiente radiale

  constructor() {
    // Genera valori leggeri per non disturbare la UX
    const angles = ['-0.4deg', '0deg', '0.4deg'];
    const translations = ['-2px', '-3px', '-4px'];
    const scales = [1.01, 1.015, 1.02];
    const rnd = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    
    // Genera un colore random evitando quelli del tema
    const randomColor = this.generateRandomColorAvoidingTheme();
    
    this.hoverRotate.set(rnd(angles));
    this.hoverTranslate.set(rnd(translations));
    this.hoverScale.set(rnd(scales));
    // Shadow più intenso: blur maggiore (da 22px a 32px) e opacità aumentata (da 0.12 a 0.25)
    const shadowColor = randomColor.replace(/,\s*0\.12\)$/, ', 0.25)');
    this.hoverShadow.set(`0 12px 32px ${shadowColor}`);
    this.hoverMetaBackgroundColor.set(randomColor.replace(/,\s*0\.12\)$/, ', 0.08)'));
    
    // Estrae il colore RGB per il gradiente radiale (con opacità più alta per essere visibile)
    const rgbMatch = randomColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      this.radialGradientColor.set(`rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 0.15)`);
    }
  }

  /**
   * Genera un colore random evitando i colori del tema corrente
   * Usa HSL per controllo migliore della saturazione e luminosità
   */
  private generateRandomColorAvoidingTheme(): string {
    const isDark = this.themeService.isDark();
    
    // Colori del tema da evitare (in HSL)
    // Light: accent arancione ~hsl(25, 95%, 53%), background giallino ~hsl(48, 100%, 92%)
    // Dark: accent giallo ~hsl(45, 100%, 72%), background scuro ~hsl(240, 2%, 15%)
    
    let hue: number;
    let saturation: number;
    let lightness: number;
    let attempts = 0;
    const maxAttempts = 50;
    
    do {
      // Genera hue random (0-360)
      hue = Math.floor(Math.random() * 360);
      
      // Saturazione alta per colori vivaci (60-90%)
      saturation = 60 + Math.random() * 30;
      
      // Luminosità media per essere visibile in entrambi i temi (45-65%)
      lightness = 45 + Math.random() * 20;
      
      attempts++;
    } while (
      attempts < maxAttempts && 
      this.isTooSimilarToThemeColor(hue, saturation, lightness, isDark)
    );
    
    // Converti HSL a RGB
    const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);
    
    // Ritorna rgba con opacità per shadow
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
  }

  /**
   * Verifica se un colore HSL è troppo simile ai colori del tema
   */
  private isTooSimilarToThemeColor(h: number, s: number, l: number, isDark: boolean): boolean {
    if (isDark) {
      // Evita colori simili all'accent giallo (hue ~45)
      const yellowHueDiff = Math.abs(h - 45);
      if (yellowHueDiff < 30 && s > 80 && l > 60) return true;
      
      // Evita colori troppo scuri (simili al background)
      if (l < 20) return true;
      
      // Evita grigi (bassa saturazione)
      if (s < 20) return true;
    } else {
      // Evita colori simili all'accent arancione (hue ~25)
      const orangeHueDiff = Math.abs(h - 25);
      if (orangeHueDiff < 30 && s > 70) return true;
      
      // Evita colori troppo chiari (simili al background giallino)
      if (l > 85) return true;
      
      // Evita gialli troppo simili al background (hue ~48-55)
      const yellowBgHueDiff = Math.min(Math.abs(h - 48), Math.abs(h - 55));
      if (yellowBgHueDiff < 15 && l > 80) return true;
      
      // Evita grigi (bassa saturazione)
      if (s < 20) return true;
    }
    
    return false;
  }

  /**
   * Converte HSL a RGB
   */
  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // Achromatic (grey)
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  play() {
    const v = this.videoEl?.nativeElement;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {/* ignoriamo errori autoplay */});
  }
  pause() {
    const v = this.videoEl?.nativeElement;
    if (!v) return;
    v.pause();
  }

  onAdminButtonClick(event: Event): void {
    event.stopPropagation();
    const id = this.progetto().id;
    this.api.delete$(id).subscribe({
      next: () => {
        this.deleted.emit(id);
      },
      error: (err) => {
        // Emetti l'errore al componente parent per mostrare una notifica
        this.deletedError.emit({ id, error: err });
      }
    });
  }

  onCardClick(): void {
    // Emetti il progetto per aprire il modal
    this.clicked.emit(this.progetto());
  }
  
  /**
   * Gestisce il cambio categoria dalla select
   */
  onCategoryChange(event: Event): void {
    event.stopPropagation(); // Previeni l'apertura del modal
    
    const select = event.target as HTMLSelectElement;
    const newCategoryId = Number(select.value);
    
    if (!newCategoryId) return;
    
    // Non fare nulla se la categoria è la stessa
    if (newCategoryId === this.progetto().category_id) return;
    
    // Stato loading
    this.changingCategory.set(true);
    
    // Usa il ProjectService che mappa correttamente la risposta
    this.api.update$(this.progetto().id, { category_id: newCategoryId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedProject) => {
          this.changingCategory.set(false);
          // Emetti il progetto aggiornato al parent
          this.categoryChanged.emit(updatedProject);
        },
        error: (err) => {
          this.changingCategory.set(false);
          // Ripristina il valore precedente nella select
          select.value = String(this.progetto().category_id || '');
        }
      });
  }
}