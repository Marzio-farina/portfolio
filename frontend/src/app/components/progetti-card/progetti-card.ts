import { Component, ElementRef, input, ViewChild, signal, inject, effect, computed, output, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgOptimizedImage } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../core/api/api-url';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { ProjectService } from '../../services/project.service';
import { TechnologyService } from '../../services/technology.service';
import { TenantService } from '../../services/tenant.service';
import { DeletionConfirmationService } from '../../services/deletion-confirmation.service';
import { OptimisticTechnologyService, OptimisticTechnology } from '../../services/optimistic-technology.service';
import { AdminDeleteButton } from '../shared/admin-delete-button/admin-delete-button';
import { DeletionOverlay } from '../shared/deletion-overlay/deletion-overlay';
import { Notification, NotificationItem, NotificationType } from '../notification/notification';
import { Subscription } from 'rxjs';

import { Progetto } from '../../core/models/project';

export type { Progetto };

interface Technology {
  id: number;
  title: string;
  description?: string | null;
}

interface HiddenTechnology extends Partial<Technology>, Partial<OptimisticTechnology> {
  column: number;
  isOthers: boolean;
}

@Component({
  selector: 'app-progetti-card',
  imports: [MatSelectModule, MatFormFieldModule, NgOptimizedImage, AdminDeleteButton, DeletionOverlay, Notification],
  providers: [DeletionConfirmationService],
  templateUrl: './progetti-card.html',
  styleUrl: './progetti-card.css'
})
export class ProgettiCard {
  progetto = input.required<Progetto>();
  priority = input<boolean>(false); // Per immagini above-the-fold
  
  @ViewChild('videoEl', { static: false }) videoEl?: ElementRef<HTMLVideoElement>;
  private readonly themeService = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly editModeService = inject(EditModeService);
  private readonly api = inject(ProjectService);
  private readonly technologyService = inject(TechnologyService);
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly optimisticTechService = inject(OptimisticTechnologyService);
  
  isAuthenticated = computed(() => this.auth.isAuthenticated());
  isEditing = computed(() => this.editModeService.isEditing());
  
  deleted = output<number>();
  deletedError = output<{ id: number; error: any }>();
  clicked = output<Progetto>();
  categoryChanged = output<Progetto>();
  
  // Service per gestione cancellazione con conferma
  deletionService = inject(DeletionConfirmationService);
  
  // Espone lo stato deleting del service
  deleting = computed(() => this.deletionService.isDeleting());
  deletingClass = computed(() => this.deletionService.deletingClass());
  
  // Lista categorie per la select (passata dal parent)
  categories = input<Array<{ id: number; title: string }>>([]);
  changingCategory = signal(false);
  
  // Flag per prevenire loop infinito
  private isUpdatingCategory = false;
  
  // Notifiche per feedback utente
  notifications = signal<NotificationItem[]>([]);
  showMultipleNotifications = true;
  
  // Tecnologie combinate (reali + ottimistiche dal service globale)
  allTechnologies = computed<(Technology | OptimisticTechnology)[]>(() => {
    const realTechs = this.progetto().technologies || [];
    const optimisticTechs = this.optimisticTechService.getTechnologiesForProject(this.progetto().id);
    return [...realTechs, ...optimisticTechs];
  });
  
  // Popup tag nascosti
  showHiddenTechsPopup = signal(false);
  popupBottom = signal('40px'); // Distanza dal bottom del wrapper
  popupLeft = signal('0px');
  private popupCloseTimer?: number;
  
  // Tag nascosti grezzi (senza layout)
  hiddenTechsRaw = computed(() => {
    const techs = this.allTechnologies();
    const isEditMode = this.isAuthenticated() && this.isEditing();
    const isInputExpanded = this.isAddTechExpanded();
    
    // Se l'input è espanso, mostra tutti tranne l'ultimo
    if (isEditMode && isInputExpanded && techs.length >= 2) {
      return techs.slice(0, -1); // Tutti tranne l'ultimo
    }
    
    if (isEditMode && techs.length >= 3) {
      return techs.slice(0, -2); // Primi N-2 tag nascosti
    }
    
    if (techs.length > 3 && !isEditMode) {
      return techs.slice(2); // Tag dal 3° in poi
    }
    
    return [];
  });
  
  // Tag nascosti con layout a due colonne e "Altri X tag"
  hiddenTechs = computed<HiddenTechnology[]>(() => {
    const techs = this.hiddenTechsRaw();
    
    if (techs.length <= 12) {
      // Mostra tutti normalmente
      return techs.map((tech, index) => ({
        ...tech,
        column: index < 6 ? 1 : 2,
        isOthers: false
      }));
    }
    
    // Più di 12 tag: mostra i primi 11 + "Altri X tag"
    const visibleTechs = techs.slice(0, 11);
    const remainingCount = techs.length - 11;
    
    return [
      ...visibleTechs.map((tech, index) => ({
        ...tech,
        column: index < 6 ? 1 : 2,
        isOthers: false
      })),
      {
        id: -999, // ID speciale per "Altri X"
        title: `Altri ${remainingCount} tag`,
        description: null,
        column: 2,
        isOthers: true
      }
    ];
  });
  
  // Input espandibile per aggiungere tag
  isAddTechExpanded = signal(false);
  newTechValue = signal('');
  private addTechTimer: any = null;
  
  // Tecnologie disponibili per ricerca
  availableTechnologies = signal<Technology[]>([]);
  addingTechnology = signal(false);
  
  // Gestione visualizzazione tecnologie (max sulla stessa riga)
  visibleTechs = computed(() => {
    const techs = this.allTechnologies();
    const isEditMode = this.isAuthenticated() && this.isEditing();
    const isInputExpanded = this.isAddTechExpanded();
    
    // Se l'input è espanso, mostra solo 1 tag per dare spazio all'input
    if (isEditMode && isInputExpanded && techs.length >= 2) {
      return techs.slice(-1); // Solo ultimo tag
    }
    
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
      return techs.slice(-2); // Ultimi 2 tag + badge "+N"
    }
    
    return techs;
  });
  
  hiddenTechsCount = computed(() => {
    const techs = this.allTechnologies(); // Include tecnologie ottimistiche
    const isEditMode = this.isAuthenticated() && this.isEditing();
    const isInputExpanded = this.isAddTechExpanded();
    
    // Se l'input è espanso, aumenta il contatore di 1
    if (isEditMode && isInputExpanded && techs.length >= 2) {
      return techs.length - 1; // N tag - 1 visibile = N-1 nascosti
    }
    
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
    // Inizializza il service per gestione cancellazione
    this.deletionService.initialize(this.destroyRef);
    
    // Pulisce le tecnologie ottimistiche vecchie (> 5 minuti)
    this.optimisticTechService.cleanupOldTechnologies();
    
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
    
    // Carica le tecnologie disponibili per la ricerca
    this.loadTechnologies();
  }
  
  /**
   * Carica tutte le tecnologie disponibili dal backend usando il servizio con caching.
   * IMPORTANTE: Usa TechnologyService per evitare chiamate HTTP duplicate.
   * Con 9 card visibili, senza caching avresti 9 chiamate HTTP!
   */
  private loadTechnologies(): void {
    // Usa TechnologyService che ha caching con shareReplay
    // La prima card fa la chiamata HTTP, le altre 8 usano la cache
    this.technologyService.list$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (techs) => {
          this.availableTechnologies.set(techs || []);
        },
        error: (err) => {
          console.error('❌ Errore caricamento tecnologie:', err);
          this.availableTechnologies.set([]);
        }
      });
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

  /**
   * Gestisce il click sul bottone admin (X o ↩)
   */
  onAdminButtonClick(event: Event): void {
    event.stopPropagation();
    const id = this.progetto().id;

    // Usa il service per gestire la logica di conferma
    this.deletionService.handleAdminClick(
      id,
      this.api.delete$(id),
      this.api.restore$(id), // API di restore per progetti
      (deletedId) => this.deleted.emit(deletedId),
      (error) => this.deletedError.emit({ id, error }),
      (restoredProject) => this.categoryChanged.emit(restoredProject)
    );
  }

  onCardClick(): void {
    if (this.deleting()) {
      return;
    }
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
   * Toggle popup tag nascosti (click)
   */
  toggleHiddenTechsPopup(event: Event): void {
    event.stopPropagation();
    const willOpen = !this.showHiddenTechsPopup();
    
    if (willOpen) {
      this.calculatePopupPosition(event.target as HTMLElement);
      this.showHiddenTechsPopup.set(true);
      this.startPopupCloseTimer();
    } else {
      // Chiusura manuale tramite click
      this.closeHiddenTechsPopup();
    }
  }
  
  /**
   * Apre il popup tag nascosti (hover)
   */
  openHiddenTechsPopup(event: Event): void {
    // Apri solo se non è già aperto
    if (!this.showHiddenTechsPopup()) {
      this.calculatePopupPosition(event.target as HTMLElement);
      this.showHiddenTechsPopup.set(true);
      this.startPopupCloseTimer();
    }
  }
  
  /**
   * Calcola la posizione del popup in base al badge +N
   * Posizionamento relativo al wrapper (non alla finestra)
   */
  private calculatePopupPosition(element: HTMLElement): void {
    // Calcola quanti tag ci sono
    const numTags = this.hiddenTechs().length;
    const tagHeight = 32; // Altezza approssimativa di un tag
    const gap = 4; // Gap tra i tag
    
    // Layout a griglia: max 6 righe, se > 6 tag si crea seconda colonna
    const numRows = Math.min(numTags, 6);
    const totalHeight = (numRows * tagHeight) + ((numRows - 1) * gap);
    
    // Posizionamento relativo al badge +N
    // Bottom: sopra il badge (40px dal bottom del wrapper)
    const bottom = 40;
    
    // Left: allineato a sinistra rispetto al badge
    const left = 0;
    
    this.popupBottom.set(`${bottom}px`);
    this.popupLeft.set(`${left}px`);
  }
  
  /**
   * Avvia timer per chiudere il popup dopo 7 secondi
   */
  private startPopupCloseTimer(): void {
    // Cancella timer esistente
    if (this.popupCloseTimer) {
      clearTimeout(this.popupCloseTimer);
    }
    
    // Nuovo timer di 7 secondi
    this.popupCloseTimer = window.setTimeout(() => {
      this.showHiddenTechsPopup.set(false);
      this.popupCloseTimer = undefined;
    }, 7000);
  }
  
  /**
   * Chiude il popup tag nascosti
   */
  closeHiddenTechsPopup(): void {
    // Cancella timer se esiste
    if (this.popupCloseTimer) {
      clearTimeout(this.popupCloseTimer);
      this.popupCloseTimer = undefined;
    }
    this.showHiddenTechsPopup.set(false);
  }
  
  /**
   * Handler per mouseleave della card
   */
  onCardMouseLeave(): void {
    // Pausa video
    this.pause();
    
    // Chiudi popup tecnologie se aperto
    this.closeHiddenTechsPopup();
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
    // Timer di 3 secondi per collassare se non si scrive nulla
    this.addTechTimer = setTimeout(() => {
      this.collapseAddTech(true);
    }, 3000);
  }
  
  private resetAddTechTimer(): void {
    if (this.addTechTimer) {
      clearTimeout(this.addTechTimer);
      this.addTechTimer = null;
    }
    this.startAddTechTimer();
  }
  
  private collapseAddTech(saveIfNotEmpty: boolean = false): void {
    const trimmedValue = this.newTechValue().trim();
    
    if (saveIfNotEmpty && trimmedValue !== '') {
      this.addTechnologyToProject(trimmedValue);
      return; // Non collassare subito, aspetta la risposta API
    }
    
    this.isAddTechExpanded.set(false);
    this.newTechValue.set('');
    if (this.addTechTimer) {
      clearTimeout(this.addTechTimer);
      this.addTechTimer = null;
    }
  }
  
  /**
   * Aggiunge una tecnologia al progetto cercandola per nome
   * Se non esiste, la crea prima di aggiungerla
   */
  private addTechnologyToProject(techName: string): void {
    // Cerca la tecnologia per nome (case-insensitive)
    let tech = this.availableTechnologies().find(t => 
      t.title.toLowerCase() === techName.toLowerCase()
    );
    
    if (!tech) {
      // Tecnologia non trovata - creala prima
      this.createAndAddTechnology(techName);
      return;
    }
    
    // Verifica se la tecnologia è già nel progetto (incluse ottimistiche)
    const currentTechs = this.progetto().technologies || [];
    const optimisticTechs = this.optimisticTechService.getTechnologiesForProject(this.progetto().id);
    
    if (currentTechs.some(t => t.id === tech.id) || optimisticTechs.some(t => t.id === tech.id)) {
      // Già presente, mostra avviso
      this.showErrorNotification(`La tecnologia "${tech.title}" è già presente nel progetto.`);
      this.newTechValue.set('');
      setTimeout(() => {
        const input = document.querySelector('.add-tech-input') as HTMLInputElement;
        input?.focus();
      }, 0);
      return;
    }
    
    // OPTIMISTIC UPDATE: Aggiungi subito come tecnologia ottimistica
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticTech: OptimisticTechnology = {
      ...tech,
      isOptimistic: true,
      tempId,
      isRemoving: false,
      projectId: this.progetto().id
    };
    
    this.optimisticTechService.addOptimisticTechnology(this.progetto().id, optimisticTech);
    // NON collassare l'input, permetti aggiunta rapida di più tecnologie
    this.newTechValue.set('');
    
    // Focus sull'input per continuare ad aggiungere
    setTimeout(() => {
      const input = document.querySelector('.add-tech-input') as HTMLInputElement;
      input?.focus();
    }, 0);
    
    // Aggiungi la tecnologia tramite API
    this.addingTechnology.set(true);
    const newTechnologyIds = [...currentTechs.map(t => t.id), tech.id];
    
    this.api.update$(this.progetto().id, { technology_ids: newTechnologyIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedProject) => {
          // Rimuovi dalla lista ottimistica (ora è nel progetto reale)
          this.optimisticTechService.removeOptimisticTechnology(this.progetto().id, tempId);
          this.addingTechnology.set(false);
          
          // Mostra notifica di successo
          this.showSuccessNotification(`Tecnologia "${tech.title}" aggiunta al progetto "${this.progetto().title}"`);
          
          // Notifica il parent dell'update
          this.categoryChanged.emit(updatedProject);
        },
        error: (err) => {
          console.error('❌ Errore aggiornamento progetto:', err);
          
          // Mostra notifica di errore
          this.showErrorNotification(`Impossibile aggiungere "${tech.title}" al progetto. Riprova.`);
          
          // Anima la rimozione della tecnologia ottimistica
          this.removeOptimisticTechnology(tempId);
          this.addingTechnology.set(false);
        }
      });
  }
  
  /**
   * Crea una nuova tecnologia e poi la aggiunge al progetto
   */
  private createAndAddTechnology(techName: string): void {
    const userId = this.tenant.userId();
    const trimmedName = techName.trim();
    
    // Verifica se la tecnologia con questo nome è già nel progetto (o nelle ottimistiche)
    const currentTechs = this.progetto().technologies || [];
    const optimisticTechs = this.optimisticTechService.getTechnologiesForProject(this.progetto().id);
    
    const alreadyExists = currentTechs.some(t => t.title.toLowerCase() === trimmedName.toLowerCase()) ||
                         optimisticTechs.some(t => t.title.toLowerCase() === trimmedName.toLowerCase());
    
    if (alreadyExists) {
      // Tecnologia già presente, mostra avviso
      this.showErrorNotification(`La tecnologia "${trimmedName}" è già presente nel progetto.`);
      this.newTechValue.set('');
      // Focus sull'input per continuare ad aggiungere
      setTimeout(() => {
        const input = document.querySelector('.add-tech-input') as HTMLInputElement;
        input?.focus();
      }, 0);
      return;
    }
    
    // OPTIMISTIC UPDATE: Crea tecnologia temporanea con ID temporaneo
    const tempId = `temp-new-${Date.now()}-${Math.random()}`;
    const optimisticTech: OptimisticTechnology = {
      id: -1, // ID provvisorio (sarà sostituito)
      title: trimmedName,
      isOptimistic: true,
      tempId,
      isRemoving: false,
      projectId: this.progetto().id
    };
    
    this.optimisticTechService.addOptimisticTechnology(this.progetto().id, optimisticTech);
    this.newTechValue.set('');
    
    // Focus sull'input per continuare ad aggiungere
    setTimeout(() => {
      const input = document.querySelector('.add-tech-input') as HTMLInputElement;
      input?.focus();
    }, 0);
    
    this.addingTechnology.set(true);
    
    const body = {
      title: trimmedName,
      user_id: userId
    };
    
    this.http.post<{ ok: boolean; data: Technology; is_new: boolean }>(apiUrl('technologies'), body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // Aggiungi la nuova tecnologia alla lista disponibili
          const currentAvailable = this.availableTechnologies();
          this.availableTechnologies.set([...currentAvailable, response.data]);
          
          // Ora aggiungila al progetto
          const currentTechs = this.progetto().technologies || [];
          const newTechnologyIds = [...currentTechs.map(t => t.id), response.data.id];
          
          this.api.update$(this.progetto().id, { technology_ids: newTechnologyIds })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (updatedProject) => {
                // Rimuovi dalla lista ottimistica
                this.optimisticTechService.removeOptimisticTechnology(this.progetto().id, tempId);
                this.addingTechnology.set(false);
                
                // Mostra notifica di successo
                this.showSuccessNotification(`Nuova tecnologia "${trimmedName}" aggiunta al progetto "${this.progetto().title}"`);
                
                // Notifica il parent dell'update
                this.categoryChanged.emit(updatedProject);
              },
              error: (err) => {
                console.error('❌ Errore aggiornamento progetto con nuova tecnologia:', err);
                this.showErrorNotification(`Impossibile aggiungere "${trimmedName}" al progetto. Riprova.`);
                this.removeOptimisticTechnology(tempId);
                this.addingTechnology.set(false);
              }
            });
        },
        error: (err) => {
          console.error('❌ Errore creazione tecnologia:', err);
          this.showErrorNotification(`Impossibile creare la tecnologia "${trimmedName}". Riprova.`);
          this.removeOptimisticTechnology(tempId);
          this.addingTechnology.set(false);
        }
      });
  }
  
  /**
   * Rimuove una tecnologia ottimistica con animazione di distruzione
   */
  private removeOptimisticTechnology(tempId: string): void {
    const projectId = this.progetto().id;
    
    // Prima attiva l'animazione di rimozione
    this.optimisticTechService.markAsRemoving(projectId, tempId);
    
    // Dopo 400ms (durata animazione), rimuovila completamente
    setTimeout(() => {
      this.optimisticTechService.removeOptimisticTechnology(projectId, tempId);
    }, 400);
  }
  
  /**
   * Verifica se una tecnologia è ottimistica
   */
  isOptimisticTech(tech: Technology | OptimisticTechnology | HiddenTechnology): tech is OptimisticTechnology {
    return 'isOptimistic' in tech && tech.isOptimistic === true;
  }
  
  /**
   * Verifica se una tecnologia ottimistica è in fase di rimozione
   */
  isRemovingTech(tech: Technology | OptimisticTechnology | HiddenTechnology): boolean {
    return this.isOptimisticTech(tech) && tech.isRemoving === true;
  }
  
  /**
   * Track function per @for delle tecnologie (supporta reali + ottimistiche)
   */
  trackByTech(index: number, tech: Technology | OptimisticTechnology | HiddenTechnology): string | number {
    if (this.isOptimisticTech(tech) && tech.tempId) {
      return tech.tempId;
    }
    return tech.id ?? index;
  }
  
  /**
   * Tronca il titolo di una tecnologia a 7 caratteri con ellipsis
   */
  truncateTechTitle(title: string): string {
    const maxLength = 7;
    if (title.length <= maxLength) {
      return title;
    }
    return title.substring(0, maxLength) + '...';
  }
  
  /**
   * Aggiunge una notifica di successo
   */
  private showSuccessNotification(message: string): void {
    const notification: NotificationItem = {
      id: `success-${Date.now()}-${Math.random()}`,
      message,
      type: 'success',
      timestamp: Date.now(),
      fieldId: 'technology-add'
    };
    
    this.notifications.update(notifs => [...notifs, notification]);
  }
  
  /**
   * Aggiunge una notifica di errore
   */
  private showErrorNotification(message: string): void {
    const notification: NotificationItem = {
      id: `error-${Date.now()}-${Math.random()}`,
      message,
      type: 'error',
      timestamp: Date.now(),
      fieldId: 'technology-add'
    };
    
    this.notifications.update(notifs => [...notifs, notification]);
  }
  
  /**
   * Ottiene la notifica più grave
   */
  getMostSevereNotification(): NotificationItem | null {
    const currentNotifications = this.notifications();
    if (currentNotifications.length === 0) return null;
    
    const severityOrder: Record<NotificationType, number> = {
      error: 4,
      warning: 3,
      success: 2,
      info: 1
    };
    
    return currentNotifications.reduce((mostSevere, current) => {
      if (!mostSevere) return current;
      return severityOrder[current.type] > severityOrder[mostSevere.type] ? current : mostSevere;
    }, currentNotifications[0]);
  }
  
  onTechInput(event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.newTechValue.set(input.value);
    this.resetAddTechTimer();
  }
  
  onTechBlur(): void {
    // Collassa dopo un breve delay, salvando se c'è testo
    if (this.addTechTimer) {
      clearTimeout(this.addTechTimer);
      this.addTechTimer = null;
    }
    
    this.addTechTimer = setTimeout(() => {
      this.collapseAddTech(true); // Salva se c'è testo
    }, 300);
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
      
      // Aggiungi la tecnologia
      this.addTechnologyToProject(trimmedValue);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.collapseAddTech();
    }
  }
}