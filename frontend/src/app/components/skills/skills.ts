import { 
  Component, 
  ViewChild, 
  signal, 
  inject, 
  computed,
  effect,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SplineReactLikeComponent } from '../spline-react-like/spline-react-like';
import { ThreeText3DComponent } from '../three-text-3d/three-text-3d.component';
import { Application } from '@splinetool/runtime';
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
export class SkillsSectionComponent {
  @ViewChild(SplineReactLikeComponent) splineComponent?: SplineReactLikeComponent;
  
  // Services
  private readonly keyboardService = inject(SplineKeyboardService);
  
  // Signals (Angular 20)
  private readonly splineApp = signal<Application | undefined>(undefined);
  readonly hoveredSkill = signal<SkillData | null>(null);
  private readonly pressedKey = signal<string | null>(null);
  private readonly warnedKeys = signal<Set<string>>(new Set());
  
  
  // Computed (Angular 20 - auto-caching, no re-renders inutili)
  readonly hasHoveredSkill = computed(() => this.hoveredSkill() !== null);
  readonly skillLabel = computed(() => this.hoveredSkill()?.label ?? '');
  readonly skillDescription = computed(() => this.hoveredSkill()?.shortDescription ?? '');
  
  // Configurazione
  readonly splineSceneUrl = '/assets/skills-keyboard.splinecode';
  private readonly KEYBOARD_SCALE = 0.4; // Scala aumentata per picking migliore
  private readonly RETRY_DELAYS = [500, 1000, 2000];
  
  constructor() {
    // Effect per tracking skill (Angular 20)
    effect(() => {
      const skill = this.hoveredSkill();
      // Il testo viene aggiornato automaticamente tramite i computed signals
    });
  }

  async onSplineLoad(app: Application): Promise<void> {
    this.splineApp.set(app);
    await this.initializeKeyboard();
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

    app.addEventListener('keyUp' as any, () => {
      this.handleKeyUp();
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
    
    if (!targetName || IGNORE_OBJECTS.includes(targetName)) {
      this.clearHoveredSkill();
      return;
    }

    const skill = SKILLS_DATA[targetName];
    
    if (!skill) {
      this.warnUnmappedSkill(targetName);
      this.clearHoveredSkill();
      return;
    }

    this.updateHoveredSkill(skill);
  }

  private handleKeyDown(event: any): void {
    const skill = this.getSkillFromEvent(event);
    if (skill) {
      this.pressedKey.set(event.target.name);
      this.updateHoveredSkill(skill);
      this.animateKeyPress(event.target.name, true);
    }
  }

  private handleKeyUp(): void {
    const keyName = this.pressedKey();
    if (keyName) {
      this.animateKeyPress(keyName, false);
      this.pressedKey.set(null);
    }
    this.clearHoveredSkill();
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

    // Anima il tasto verso il basso quando premuto
    const targetY = pressed ? keyObject.position.y - 10 : keyObject.position.y + 10;
    
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
}
