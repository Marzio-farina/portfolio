import { 
  Component, 
  ViewChild, 
  signal, 
  inject, 
  computed,
  effect,
  ChangeDetectionStrategy,
  OnDestroy,
  AfterViewInit,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SplineReactLikeComponent } from '../spline-react-like/spline-react-like';
import { ThreeText3DComponent } from '../three-text-3d/three-text-3d.component';

// Spline Application caricato dinamicamente
type Application = any;
import { SplineKeyboardService } from '../../services/spline-keyboard.service';
import { 
  SkillData,
  SKILL_DEFINITIONS,
  KEY_MODIFICATIONS,
  IGNORE_OBJECTS,
  createSkillsDataMap,
  applyKeyModifications
} from '../../models/skills.model';

// Inizializza mappa skills
const SKILLS_DATA = createSkillsDataMap(SKILL_DEFINITIONS);

// ============================================
// COMPONENT
// ============================================

@Component({
  selector: 'app-skills-section',
  imports: [CommonModule, SplineReactLikeComponent, ThreeText3DComponent],
  templateUrl: './skills.html',
  styleUrl: './skills.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkillsSectionComponent implements OnDestroy, AfterViewInit {
  @ViewChild(SplineReactLikeComponent) splineComponent?: SplineReactLikeComponent;
  @ViewChild('skillsContainer') containerRef?: ElementRef<HTMLDivElement>;
  
  // Services
  private readonly keyboardService = inject(SplineKeyboardService);
  
  // Signals (Angular 20)
  private readonly splineApp = signal<Application | undefined>(undefined);
  readonly hoveredSkill = signal<SkillData | null>(null);
  private readonly pressedKey = signal<string | null>(null);
  private readonly warnedKeys = signal<Set<string>>(new Set());
  
  // Tracking posizioni originali dei tasti per animazione corretta
  private readonly originalKeyPositions = new Map<string, number>();
  // Set dei tasti attualmente premuti
  private readonly pressedKeys = new Set<string>();
  
  // Throttling per hover più fluido
  private hoverThrottleTimeout: any = null;
  private lastHoveredKey: string | null = null;
  
  // Responsive - traccia larghezza container per adattamenti
  readonly viewportWidth = signal<number>(typeof window !== 'undefined' ? window.innerWidth : 1920);
  private resizeObserver: ResizeObserver | null = null;
  
  // Computed (Angular 20 - auto-caching, no re-renders inutili)
  readonly hasHoveredSkill = computed(() => this.hoveredSkill() !== null);
  readonly skillLabel = computed(() => this.hoveredSkill()?.label ?? '');
  readonly skillDescription = computed(() => this.hoveredSkill()?.shortDescription ?? '');
  readonly isMobile = computed(() => this.viewportWidth() < 768); // Breakpoint mobile unico
  
  // Configurazione
  readonly splineSceneUrl = '/assets/skills-keyboard.splinecode';
  private readonly KEYBOARD_SCALE = 0.3; // Scala ridotta per desktop (30%)
  private readonly RETRY_DELAYS = [500, 1000, 2000];
  
  constructor() {
    // Effect per tracking skill (Angular 20)
    effect(() => {
      const skill = this.hoveredSkill();
      // Il testo viene aggiornato automaticamente tramite i computed signals
    });
    
    // Effect per applicare responsive alla tastiera quando cambia viewport
    effect(() => {
      const mobile = this.isMobile();
      const app = this.splineApp();
      
      if (app) {
        this.applyResponsiveTransform(app, mobile);
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  async onSplineLoad(app: Application): Promise<void> {
    this.splineApp.set(app);
    await this.initializeKeyboard();
    // Applica trasformazione responsive iniziale
    this.applyResponsiveTransform(app, this.isMobile());
  }

  // ============================================
  // INITIALIZATION (DRY)
  // ============================================

  private async initializeKeyboard(): Promise<void> {
    const app = this.splineApp();
    if (!app) return;

    this.toggleCanvasVisibility(false);

    try {
      this.optimizeKeyboard(app);
      await this.applyAllKeyModifications(app);
      this.setupAllEventListeners(app);
    } finally {
      setTimeout(() => this.toggleCanvasVisibility(true), 100);
    }
  }

  // ============================================
  // KEYBOARD OPTIMIZATION
  // ============================================

  private optimizeKeyboard(app: Application): void {
    const keyboard = app.findObjectByName('keyboard');
    if (!keyboard?.scale) return;

    // Scala ottimale per picking mouse preciso (non modificare!)
    // Valori testati: 0.35-0.45 funzionano bene
    // Valori < 0.3 causano problemi di picking mouse
    const optimalScale = 0.35; // Scala fissa ottimale

    Object.assign(keyboard.scale, {
      x: optimalScale,
      y: optimalScale,
      z: optimalScale
    });

    // Posiziona tastiera leggermente a sinistra
    Object.assign(keyboard.position, { 
      x: -170,  // Spostata a sinistra
      y: 100, 
      z: 0 
    });
    
    // Ottimizza camera per migliore vista
    this.optimizeCamera(app);
  }

  private optimizeCamera(app: Application): void {
    const camera = app.findObjectByName('Camera');
    if (!camera) return;

    // Avvicina la camera per ingrandire la vista senza cambiare scala
    // Questo mantiene il picking preciso
    if (camera.position) {
      camera.position.z = camera.position.z * 0.7; // Avvicina del 30%
    }
  }


  // ============================================
  // KEY MODIFICATIONS (DRY + Performance)
  // ============================================

  private async applyAllKeyModifications(app: Application): Promise<void> {
    // Aggiorna dati PRIMA delle modifiche visuali
    applyKeyModifications(SKILLS_DATA, KEY_MODIFICATIONS);

    // Esegui modifiche visuali in parallelo
    await Promise.all(
      KEY_MODIFICATIONS.map(mod => 
        this.keyboardService.modifyKey(app, {
          keyName: mod.originalKey,
          color: mod.color,
          iconUrl: mod.iconUrl,
          whiteIcon: false
        })
      )
    );
  }

  // ============================================
  // EVENT LISTENERS (DRY)
  // ============================================

  private setupAllEventListeners(app: Application): void {
    this.setupHoverListener(app);
    this.setupKeyPressListeners(app);
    this.setupClickListener(app);
  }

  private setupHoverListener(app: Application): void {
    app.addEventListener('mouseHover' as any, (event: any) => {
      this.handleHoverEvent(event);
    });
  }

  private setupKeyPressListeners(app: Application): void {
    app.addEventListener('keyDown' as any, (event: any) => {
      this.handleKeyDown(event);
    });

    app.addEventListener('keyUp' as any, (event: any) => {
      this.handleKeyUp(event); // Passa l'evento per sapere quale tasto rilasciare
    });
  }

  private setupClickListener(app: Application): void {
    app.addEventListener('mouseDown' as any, (event: any) => {
      this.handleClick(event);
    });
  }

  // ============================================
  // EVENT HANDLERS (DRY + Performance)
  // ============================================

  private handleHoverEvent(event: any): void {
    const targetName = event.target?.name;
    
    // Throttling - evita aggiornamenti troppo frequenti
    if (targetName === this.lastHoveredKey) {
      return; // Stesso tasto - skip
    }
    
    if (!targetName || IGNORE_OBJECTS.includes(targetName)) {
      this.clearHoveredSkill();
      this.lastHoveredKey = null;
      return;
    }

    const skill = SKILLS_DATA[targetName];
    
    if (!skill) {
      this.warnUnmappedSkill(targetName);
      this.clearHoveredSkill();
      this.lastHoveredKey = null;
      return;
    }

    // Throttle update - max 1 ogni 100ms per fluidità
    if (this.hoverThrottleTimeout) {
      clearTimeout(this.hoverThrottleTimeout);
    }

    this.hoverThrottleTimeout = setTimeout(() => {
      this.updateHoveredSkill(skill);
      this.lastHoveredKey = targetName;
    }, 50); // Delay minimo per fluidità
  }

  private handleKeyDown(event: any): void {
    const skill = this.getSkillFromEvent(event);
    const keyName = event.target?.name;
    
    if (skill && keyName) {
      // Previeni pressione ripetuta se già premuto
      if (this.pressedKeys.has(keyName)) {
        return;
      }
      
      this.pressedKeys.add(keyName);
      this.pressedKey.set(keyName);
      this.updateHoveredSkill(skill);
      this.animateKeyPress(keyName, true);
    }
  }

  private handleKeyUp(event: any): void {
    const keyName = event.target?.name;
    
    if (keyName && this.pressedKeys.has(keyName)) {
      this.pressedKeys.delete(keyName);
      this.animateKeyPress(keyName, false);
      
      // Resetta pressedKey solo se era questo tasto
      if (this.pressedKey() === keyName) {
        this.pressedKey.set(null);
      }
    }
    
    // Pulisci hoveredSkill solo se non ci sono più tasti premuti
    if (this.pressedKeys.size === 0) {
      this.clearHoveredSkill();
    }
  }

  private handleClick(event: any): void {
    const skill = this.getSkillFromEvent(event);
    // Listener attivo ma logging rimosso per console pulita
  }

  // ============================================
  // HELPER METHODS (DRY)
  // ============================================

  private getSkillFromEvent(event: any): SkillData | null {
    return event.target?.name ? SKILLS_DATA[event.target.name] : null;
  }

  private updateHoveredSkill(skill: SkillData): void {
    if (this.hoveredSkill()?.label !== skill.label) {
      this.hoveredSkill.set(skill);
    }
  }

  private clearHoveredSkill(): void {
    if (this.hoveredSkill()) {
      this.hoveredSkill.set(null);
    }
  }

  private warnUnmappedSkill(keyName: string): void {
    const warned = this.warnedKeys();
    if (!warned.has(keyName)) {
      // Log solo in development
      if (typeof window !== 'undefined' && (window as any).ngDevMode) {
        console.warn(`⚠️ Skill non mappata: "${keyName}"`);
      }
      warned.add(keyName);
      this.warnedKeys.set(new Set(warned));
    }
  }

  private toggleCanvasVisibility(visible: boolean): void {
    if (!this.splineComponent) return;

    const canvas = document.querySelector('.spline-canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.opacity = visible ? '1' : '0';
      canvas.style.visibility = visible ? 'visible' : 'hidden';
      canvas.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }

  // ============================================
  // ANIMATION - Effetto tasto premuto
  // ============================================

  private animateKeyPress(keyName: string, pressed: boolean): void {
    const app = this.splineApp();
    if (!app) return;

    const keyObject = app.findObjectByName(keyName);
    if (!keyObject) return;

    // Salva posizione originale se non già salvata
    if (!this.originalKeyPositions.has(keyName)) {
      this.originalKeyPositions.set(keyName, keyObject.position.y);
    }

    const originalY = this.originalKeyPositions.get(keyName)!;
    
    // Usa SEMPRE la posizione originale come riferimento
    const targetY = pressed ? originalY - 10 : originalY;
    
    // Animazione smooth con interpolazione
    this.animatePosition(keyObject, targetY, 150);
  }

  private animatePosition(object: any, targetY: number, duration: number): void {
    const startY = object.position.y;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      object.position.y = startY + (targetY - startY) * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  // ============================================
  // RESPONSIVE - Adattamento viewport
  // ============================================

  private setupResizeObserver(): void {
    if (typeof window === 'undefined') return;
    
    // Traccia resize del container per responsive
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        this.viewportWidth.set(width);
      }
    });
    
    // Osserva il container skills
    if (this.containerRef) {
      this.resizeObserver.observe(this.containerRef.nativeElement);
    }
    
    // Fallback: traccia resize della window
    const handleResize = () => {
      this.viewportWidth.set(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    
    // Inizializza con la larghezza attuale
    this.viewportWidth.set(window.innerWidth);
  }

  private applyResponsiveTransform(app: Application, isMobile: boolean): void {
    if (!app) return;
    
    // Trova il gruppo principale della tastiera
    const keyboard = app.findObjectByName('Keyboard') || app.findObjectByName('keyboard');
    
    if (!keyboard) {
      // Fallback: ruota tutti gli oggetti chiave
      return;
    }
    
    if (isMobile) {
      // MOBILE: Ruota tastiera di 90° sul piano Z per orientamento verticale
      // La tastiera rimane vista dall'alto, ma ruotata per schermi stretti
      keyboard.rotation.x = 0;      // Nessuna inclinazione - vista dall'alto
      keyboard.rotation.y = 0;      // Nessuna rotazione Y
      keyboard.rotation.z = Math.PI / 2;  // 90° - verticale invece che orizzontale
      keyboard.scale.set(0.35, 0.35, 0.35); // Ridotta per stare nello schermo
      keyboard.position.x = 0;      // Centrata orizzontalmente
      keyboard.position.y = -100;   // Spostata giù per lasciare spazio al testo sopra
      keyboard.position.z = 0;
    } else {
      // DESKTOP: Vista dall'alto orizzontale, spostata a sinistra
      keyboard.rotation.x = 0;
      keyboard.rotation.y = 0;
      keyboard.rotation.z = 0;      // Orizzontale
      keyboard.scale.set(this.KEYBOARD_SCALE, this.KEYBOARD_SCALE, this.KEYBOARD_SCALE);
      keyboard.position.x = -100;   // Spostata a sinistra
      keyboard.position.y = 0;
      keyboard.position.z = 0;
    }
  }

  private cleanup(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    if (this.hoverThrottleTimeout) {
      clearTimeout(this.hoverThrottleTimeout);
    }
  }
}
