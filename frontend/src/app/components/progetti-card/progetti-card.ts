import { Component, ElementRef, input, ViewChild, signal, inject, effect, computed, output, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { ProjectService } from '../../services/project.service';

import { Progetto } from '../../core/models/project';

export type { Progetto };

@Component({
  selector: 'app-progetti-card',
  imports: [MatSelectModule, MatFormFieldModule],
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
  
  // Flag per prevenire loop infinito
  private isUpdatingCategory = false;
  
  // Popup tag nascosti
  showHiddenTechsPopup = signal(false);
  hiddenTechs = computed(() => {
    const techs = this.progetto().technologies || [];
    const isEditMode = this.isAuthenticated() && this.isEditing();
    
    if (isEditMode && techs.length >= 3) {
      return techs.slice(0, -2); // Primi N-2 tag nascosti
    }
    
    if (techs.length > 3 && !isEditMode) {
      return techs.slice(2); // Tag dal 3° in poi
    }
    
    return [];
  });
  
  // Input espandibile per aggiungere tag
  isAddTechExpanded = signal(false);
  newTechValue = signal('');
  private addTechTimer: any = null;
  
  // Gestione visualizzazione tecnologie (max sulla stessa riga)
  visibleTechs = computed(() => {
    const techs = this.progetto().technologies || [];
    const isEditMode = this.isAuthenticated() && this.isEditing();
    
    // In edit mode, dobbiamo lasciare spazio per il bottone +
    // Se ci sono 3+ tag, mostra badge "+N" + ultimi 2 tag + bottone +
    if (isEditMode && techs.length >= 3) {
      return techs.slice(-2); // Ultimi 2 tag
    }
    
    // In view mode o se ci sono meno di 3 tag, mostra tutti
    if (techs.length <= 3 && !isEditMode) {
      return techs;
    }
    
    // Se ci sono più di 3 tag in view mode
    if (techs.length > 3 && !isEditMode) {
      return techs.slice(0, 2); // Primi 2 tag + badge "+N"
    }
    
    return techs;
  });
  
  hiddenTechsCount = computed(() => {
    const techs = this.progetto().technologies || [];
    const isEditMode = this.isAuthenticated() && this.isEditing();
    
    // In edit mode con 3+ tag: mostra badge "+N" con i primi N-2 tag
    if (isEditMode && techs.length >= 3) {
      return techs.length - 2;
    }
    
    // In view mode con più di 3 tag
    if (techs.length > 3 && !isEditMode) {
      return techs.length - 2;
    }
    
    return 0;
  });

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
   * Ottiene il category_id corrente del progetto
   */
  getCurrentCategoryId(): number | null {
    return this.progetto().category_id ?? null;
  }
  
  /**
   * Gestisce il cambio categoria dal mat-select
   */
  onCategorySelectionChange(newCategoryId: number): void {
    // Previeni chiamate multiple
    if (this.isUpdatingCategory) return;
    
    // Non fare nulla se la categoria è la stessa
    if (newCategoryId === this.progetto().category_id) return;
    
    // Setta il flag per prevenire loop
    this.isUpdatingCategory = true;
    
    // Stato loading
    this.changingCategory.set(true);
    
    // Usa il ProjectService che mappa correttamente la risposta
    this.api.update$(this.progetto().id, { category_id: newCategoryId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedProject) => {
          this.changingCategory.set(false);
          this.isUpdatingCategory = false;
          // Emetti il progetto aggiornato al parent
          this.categoryChanged.emit(updatedProject);
        },
        error: (err) => {
          this.changingCategory.set(false);
          this.isUpdatingCategory = false;
        }
      });
  }
  
  /**
   * Previene l'apertura del modal quando si clicca sulla select
   */
  onSelectClick(event: Event): void {
    event.stopPropagation();
  }
  
  /**
   * Toggle popup tag nascosti
   */
  toggleHiddenTechsPopup(event: Event): void {
    event.stopPropagation();
    this.showHiddenTechsPopup.update(v => !v);
  }
  
  /**
   * Chiude il popup tag nascosti
   */
  closeHiddenTechsPopup(): void {
    this.showHiddenTechsPopup.set(false);
  }
  
  /**
   * Espande il bottone + per mostrare input
   */
  onExpandAddTech(event: Event): void {
    event.stopPropagation();
    
    if (this.isAddTechExpanded()) {
      return;
    }
    
    this.isAddTechExpanded.set(true);
    this.newTechValue.set('');
    
    // Cancella timer precedenti
    if (this.addTechTimer) {
      clearTimeout(this.addTechTimer);
      this.addTechTimer = null;
    }
    
    // Avvia timer per collassare dopo 5 secondi
    this.startAddTechTimer();
    
    // Focus sull'input
    setTimeout(() => {
      const input = document.querySelector('.add-tech-input') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
  }
  
  private startAddTechTimer(): void {
    this.addTechTimer = setTimeout(() => {
      this.collapseAddTech(true);
    }, 5000);
  }
  
  private resetAddTechTimer(): void {
    if (this.addTechTimer) {
      clearTimeout(this.addTechTimer);
    }
    this.startAddTechTimer();
  }
  
  private collapseAddTech(saveIfNotEmpty: boolean = false): void {
    const trimmedValue = this.newTechValue().trim();
    
    if (saveIfNotEmpty && trimmedValue !== '') {
      // TODO: Implementare logica di salvataggio tag
      // Per ora apriamo il modal
      this.clicked.emit(this.progetto());
    }
    
    this.isAddTechExpanded.set(false);
    this.newTechValue.set('');
    if (this.addTechTimer) {
      clearTimeout(this.addTechTimer);
      this.addTechTimer = null;
    }
  }
  
  onTechInput(event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.newTechValue.set(input.value);
    this.resetAddTechTimer();
  }
  
  onTechBlur(): void {
    if (this.addTechTimer) {
      clearTimeout(this.addTechTimer);
    }
    this.addTechTimer = setTimeout(() => {
      this.collapseAddTech(true);
    }, 500);
  }
  
  onTechSubmit(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      
      const trimmedValue = this.newTechValue().trim();
      
      if (trimmedValue === '') {
        this.collapseAddTech();
        return;
      }
      
      // TODO: Implementare aggiunta tag
      // Per ora apriamo il modal
      this.clicked.emit(this.progetto());
      this.collapseAddTech();
    } else if (event.key === 'Escape') {
      this.collapseAddTech();
    }
  }
}