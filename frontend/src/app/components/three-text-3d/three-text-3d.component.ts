import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  input,
  signal
} from '@angular/core';

// Three.js caricato dinamicamente per evitare conflitti con Spline
type THREE = typeof import('three');

@Component({
  selector: 'app-three-text-3d',
  standalone: true,
  template: `
    <canvas 
      #canvas 
      class="three-canvas" 
      [style.opacity]="visible() ? '1' : '0'"></canvas>
  `,
  styles: [`
    .three-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none !important;
      z-index: 10;
      transition: opacity 0.3s;
    }
  `]
})
export class ThreeText3DComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Inputs da parent
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly visible = input<boolean>(false);
  readonly isMobile = input<boolean>(false);  // Responsive mobile
  readonly keyPosition = input<{x: number, y: number, z: number} | null>(null); // Posizione tasto per mobile

  // Three.js objects (caricati dinamicamente)
  private THREE: THREE | null = null;
  private scene: any = null;
  private camera: any = null;
  private renderer: any = null;
  private titleMesh: any = null;
  private descriptionMeshes: any[] = [];
  private font: any = null;
  private animationFrameId: number = 0;
  
  // Configurazione
  private readonly MAX_DESC_CHARS_PER_LINE = 45;
  private resizeObserver: ResizeObserver | null = null;
  
  // Signal per gestire il loading
  protected readonly isLoading = signal(true);
  
  // Tracking per cancellare operazioni async in corso
  private currentUpdateId = 0;
  
  // Cache delle geometrie create per riutilizzo
  private geometryCache = new Map<string, any>();

  // Nessun constructor necessario - usiamo ngOnChanges

  async ngAfterViewInit() {
    // Carica Three.js in modo lazy
    await this.loadThreeJS();
    
    if (!this.THREE) return;
    
    // 1. Mostra il canvas PRIMA di inizializzare WebGL
    this.isLoading.set(false);
    
    // 2. Aspetta che Angular renderizzi il canvas nel DOM
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    
    // 3. Aspetta che il canvas abbia dimensioni valide (max 5 secondi)
    await this.waitForValidDimensions();
    
    // 4. Inizializza Three.js solo se canvas ha dimensioni valide
    const initialized = await this.initThree();
    
    if (initialized) {
      this.animate();
      this.setupResize();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Aggiorna il testo quando cambiano gli input
    if ((changes['title'] || changes['description'] || changes['visible'] || 
         changes['isMobile'] || changes['keyPosition']) && 
        this.font && this.scene && this.THREE) {
      
      const titleText = this.title();
      const descText = this.description();
      const isVisible = this.visible();
      
      // Esegui update async senza bloccare Angular
      this.updateText(titleText, descText, isVisible).catch(() => {
        // Gestione errori silenziosa
      });
    }
    
    // Aggiorna camera quando cambia il responsive mode
    if (changes['isMobile'] && this.camera) {
      this.updateCameraForResponsive();
    }
  }

  private async waitForValidDimensions(): Promise<void> {
    if (!this.canvasRef) return;
    
    const canvas = this.canvasRef.nativeElement;
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return; // Dimensioni valide trovate
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private async loadThreeJS() {
    try {
      // Lazy load di Three.js - separato da Spline
      this.THREE = await import('three');
    } catch (error) {
      // Errore silenzioso - fallback graceful
    }
  }

  private async initThree(): Promise<boolean> {
    if (!this.THREE || !this.canvasRef) return false;
    
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // DOPPIA VERIFICA dimensioni valide prima di inizializzare WebGL
    if (rect.width <= 0 || rect.height <= 0) {
      console.warn('⚠️ Three.js: Canvas has zero dimensions, initialization aborted');
      return false;
    }

    const THREE = this.THREE;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // Camera ortografica per vista isometrica - responsive
    const aspect = rect.width / rect.height;
    const frustumSize = this.getFrustumSize();
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      1,
      2000
    );
    
    // Posizione camera responsive
    const cameraPos = this.getCameraPosition();
    this.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    
    // LookAt responsive
    const lookAtY = this.isMobile() ? 300 : 150;
    this.camera.lookAt(0, lookAtY, 0);

    // Renderer - usa dimensioni del bounding box
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Luci
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
    frontLight.position.set(0, 100, 500);
    this.scene.add(frontLight);

    const extrusionLight = new THREE.DirectionalLight(0xaaaaaa, 0.9);
    extrusionLight.position.set(-200, -150, -300);
    this.scene.add(extrusionLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(0, 300, 200);
    this.scene.add(fillLight);

    await this.loadFont();
    
    return true; // Inizializzazione completata con successo
  }

  private async loadFont() {
    if (!this.THREE) return;

    const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js');
    const loader = new FontLoader();

    return new Promise<void>((resolve) => {
      // Font locale - zero cached egress esterno!
      loader.load(
        '/assets/fonts/droid_sans_bold.typeface.json',
        (font: any) => {
          this.font = font;
          resolve();
        },
        undefined,
        (error: any) => {
          // Fallback a gentilis locale se droid non disponibile
          loader.load(
            '/assets/fonts/gentilis_bold.typeface.json',
            (font: any) => {
              this.font = font;
              resolve();
            },
            undefined,
            () => {
              // Errore silenzioso - fallback graceful
              resolve();
            }
          );
        }
      );
    });
  }

  private async updateText(title: string, description: string, visible: boolean) {
    if (!this.THREE || !this.scene) return;

    // Incrementa ID per tracciare questa richiesta
    const updateId = ++this.currentUpdateId;

    // Rimuovi mesh esistenti IMMEDIATAMENTE
    if (this.titleMesh) {
      this.scene.remove(this.titleMesh);
      this.titleMesh.geometry.dispose();
      this.titleMesh.material.dispose();
      this.titleMesh = null;
    }
    
    this.descriptionMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.descriptionMeshes = [];

    if (!visible || !title || !this.font) {
      return;
    }

    const { TextGeometry } = await import('three/examples/jsm/geometries/TextGeometry.js');
    
    // Verifica se questa è ancora la richiesta più recente
    if (updateId !== this.currentUpdateId) {
      return; // Cancella operazione se è arrivata una richiesta più recente
    }

    const THREE = this.THREE;

    // Crea o riusa titolo 3D dalla cache
    const titleCacheKey = `title_${title}`;
    let titleGeometry = this.geometryCache.get(titleCacheKey);
    
    if (!titleGeometry) {
      // Geometria ottimizzata - meno segmenti per performance
      titleGeometry = new TextGeometry(title, {
        font: this.font,
        size: 60,
        depth: 40,
        curveSegments: 12,    // Ridotto da 24 per performance
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.3,
        bevelOffset: 0,
        bevelSegments: 2
      });

      titleGeometry.computeVertexNormals();
      titleGeometry.computeBoundingBox();
      titleGeometry.center();
      
      // Salva in cache per riutilizzo
      this.geometryCache.set(titleCacheKey, titleGeometry);
    }

    const titleMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      metalness: 0.0,
      roughness: 0.7,
      emissive: 0x000000,
      emissiveIntensity: 0,
      flatShading: false,
      side: THREE.FrontSide
    });

    // Verifica di nuovo se questa è ancora la richiesta valida
    if (updateId !== this.currentUpdateId) {
      titleGeometry.dispose();
      titleMaterial.dispose();
      return;
    }

    this.titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    
    // Posizioni e rotazioni responsive
    const textPos = this.getTextPosition('title');
    const textRot = this.getTextRotation();
    const textScale = this.getTextScale();
    
    this.titleMesh.position.set(textPos.x, textPos.y, textPos.z);
    this.titleMesh.rotation.set(textRot.x, textRot.y, textRot.z);
    this.titleMesh.scale.set(textScale, textScale, textScale);
    this.scene.add(this.titleMesh);

    // Crea descrizione con word-wrap
    if (description) {
      const lines = this.wrapText(description, this.MAX_DESC_CHARS_PER_LINE);
      
      const descMaterial = new THREE.MeshStandardMaterial({
        color: 0xdcdcdc,
        metalness: 0.0,
        roughness: 0.7,
        emissive: 0x000000,
        emissiveIntensity: 0,
        flatShading: false,
        side: THREE.FrontSide
      });

      lines.forEach((line, index) => {
        // Verifica se ancora valida prima di ogni riga
        if (updateId !== this.currentUpdateId) {
          return;
        }

        // Usa cache per descrizioni
        const descCacheKey = `desc_${line}`;
        let descGeometry = this.geometryCache.get(descCacheKey);
        
        if (!descGeometry) {
          // Geometria ottimizzata - meno segmenti
          descGeometry = new TextGeometry(line, {
            font: this.font,
            size: 16,
            depth: 15,
            curveSegments: 12,    // Ridotto da 24
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.2,
            bevelOffset: 0,
            bevelSegments: 2
          });

          descGeometry.computeVertexNormals();
          descGeometry.center();
          
          // Salva in cache
          this.geometryCache.set(descCacheKey, descGeometry);
        }

        const descMesh = new THREE.Mesh(descGeometry, descMaterial.clone());
        
        // Posizioni e rotazioni responsive per descrizione
        const descPos = this.getTextPosition('description', index);
        const descRot = this.getTextRotation();
        const descScale = this.getTextScale();
        
        descMesh.position.set(descPos.x, descPos.y, descPos.z);
        descMesh.rotation.set(descRot.x, descRot.y, descRot.z);
        descMesh.scale.set(descScale, descScale, descScale);
        
        this.scene.add(descMesh);
        this.descriptionMeshes.push(descMesh);
      });
    }

    this.animateTextEntrance();
  }

  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private animateTextEntrance() {
    if (!this.titleMesh) return;

    const startScale = 0;
    const endScale = 1;
    const duration = 400;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const scale = startScale + (endScale - startScale) * eased;

      if (this.titleMesh) {
        this.titleMesh.scale.set(scale, scale, scale);
      }
      
      this.descriptionMeshes.forEach(mesh => {
        mesh.scale.set(scale, scale, scale);
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private animate = () => {
    // Controllo di sicurezza: ferma l'animazione se il componente è stato distrutto
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }

    // Verifica che il canvas abbia ancora dimensioni valide
    const canvas = this.renderer.domElement;
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animate);

    // Animazione più leggera - oscillazione ridotta
    const time = Date.now() * 0.0002;
    
    if (this.titleMesh) {
      this.titleMesh.rotation.x = -0.3 + Math.sin(time) * 0.005;
      this.titleMesh.rotation.z = 0.40;  // Mantiene inclinazione corretta
    }
    
    this.descriptionMeshes.forEach((mesh, index) => {
      mesh.rotation.x = -0.3 + Math.sin(time + 0.5 + index * 0.1) * 0.003;
      mesh.rotation.z = 0.40;  // Mantiene inclinazione corretta
    });

    try {
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      // Se c'è un errore durante il rendering (es. WebGL context perso), ferma l'animazione
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = 0;
      }
    }
  };

  private setupResize() {
    if (!this.canvasRef) return;
    
    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
    });
    this.resizeObserver.observe(this.canvasRef.nativeElement);
  }

  private onResize() {
    if (!this.canvasRef || !this.camera || !this.renderer) return;
    
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const aspect = width / height;
    const frustumSize = this.getFrustumSize();
    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  // ============================================
  // RESPONSIVE HELPERS
  // ============================================

  private getFrustumSize(): number {
    if (this.isMobile()) return 700;      // Mobile: frustum grande per tastiera verticale
    // Tutti gli altri dispositivi: standard
    return 600;
  }

  private getCameraPosition(): { x: number; y: number; z: number } {
    if (this.isMobile()) {
      return { x: 0, y: 300, z: 800 };     // Mobile: molto lontana e alta per vedere tutto
    }
    // Tutti gli altri dispositivi: standard
    return { x: 0, y: 150, z: 500 };
  }

  private getTextPosition(type: 'title' | 'description', lineIndex: number = 0): { x: number; y: number; z: number } {
    if (this.isMobile()) {
      const keyPos = this.keyPosition();
      if (!keyPos) {
        // Fallback per mobile se keyPos è null
        if (type === 'title') return { x: -50, y: 350, z: -150 };
        return { x: -50, y: 300 - (lineIndex * 25), z: -145 + (lineIndex * 2) };
      }

      // Dopo rotazione tastiera 90° per mobile:
      // - keyPos.x varia da ~-100 (colonne sinistra) a ~100 (colonne destra) 
      // - keyPos.y varia da ~-600 (prime righe, TS/JS) a ~950 (ultime righe)
      
      // Calcola posizione X dinamica basata sulla colonna del tasto (keyPos.y)
      // Mappa il range -600 a 950 in un range visibile -150 a +150
      const minY = -600;
      const maxY = 950;
      const rangeY = maxY - minY; // 1550
      const normalizedY = (keyPos.y - minY) / rangeY; // 0 (prime righe) a 1 (ultime righe)
      const dynamicX = normalizedY * 300 - 150; // Range da -150 a +150

      // Calcola posizione Y dinamica basata sulla riga del tasto (keyPos.x)
      // Usa valore assoluto per gestire sia colonne sx (-100) che dx (+100)
      const normalizedX = Math.abs(keyPos.x); // 0-100
      const dynamicYBase = 280 + (normalizedX * 1.8); // 280-460, range visibile

      // Posizione Z, leggermente davanti al tasto
      const dynamicZ = keyPos.z - 30;

      if (type === 'title') {
        return {
          x: dynamicX,
          y: dynamicYBase,
          z: dynamicZ
        };
      } else {
        // Descrizione sotto il titolo
        const lineHeight = 25;
        const descY = dynamicYBase - 60 - (lineIndex * lineHeight);
        return {
          x: dynamicX,
          y: descY,
          z: dynamicZ + 5 + (lineIndex * 2)
        };
      }
    } else {
      // Desktop
      if (type === 'title') {
        return { x: -50, y: 270, z: 0 };
      } else {
        const baseY = 200;
        const lineHeight = 25;
        return { x: -50, y: baseY - (lineIndex * lineHeight), z: 5 + (lineIndex * 2) };
      }
    }
  }

  private getTextRotation(): { x: number; y: number; z: number } {
    // Rotazione standard per tutti i dispositivi
    return { x: -0.3, y: 0.0, z: 0.40 };
  }

  private getTextScale(): number {
    if (this.isMobile()) return 0.8;      // Mobile: ridotto
    // Tutti gli altri dispositivi: standard
    return 1.0;
  }

  private updateCameraForResponsive(): void {
    if (!this.camera || !this.canvasRef) return;
    
    const canvas = this.canvasRef.nativeElement;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const frustumSize = this.getFrustumSize();
    
    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    
    const cameraPos = this.getCameraPosition();
    this.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    
    // LookAt responsive: su mobile inquadra più in alto
    const lookAtY = this.isMobile() ? 300 : 150;
    this.camera.lookAt(0, lookAtY, 0);
    this.camera.updateProjectionMatrix();
  }

  // ============================================
  // CLEANUP
  // ============================================

  private cleanup() {
    // 1. Ferma il loop di animazione PRIMA di tutto
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }

    // 2. Disconnetti ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 3. Rimuovi tutti gli oggetti dalla scena e dispose materiali/geometrie
    if (this.scene) {
      // Rimuovi e dispose titleMesh
      if (this.titleMesh) {
        this.scene.remove(this.titleMesh);
        if (this.titleMesh.geometry) {
          this.titleMesh.geometry.dispose();
        }
        if (this.titleMesh.material) {
          if (Array.isArray(this.titleMesh.material)) {
            this.titleMesh.material.forEach((mat: any) => mat.dispose());
          } else {
            this.titleMesh.material.dispose();
          }
        }
        this.titleMesh = null;
      }

      // Rimuovi e dispose descriptionMeshes
      this.descriptionMeshes.forEach(mesh => {
        this.scene.remove(mesh);
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      this.descriptionMeshes = [];

      // Rimuovi tutte le luci
      const lights = this.scene.children.filter((child: any) => child.isLight);
      lights.forEach((light: any) => {
        this.scene.remove(light);
        if (light.dispose) light.dispose();
      });

      // Pulisci la scena
      this.scene.clear();
      this.scene = null;
    }

    // 4. Dispose cache geometrie
    this.geometryCache.forEach(geometry => {
      geometry.dispose();
    });
    this.geometryCache.clear();

    // 5. Dispose renderer e pulisci il canvas
    if (this.renderer) {
      // Dispose del renderer - questo libera automaticamente tutte le risorse WebGL
      // (texture, framebuffer, contesto WebGL, etc.)
      // NON tentare di ottenere un nuovo contesto WebGL con getContext() - fallirebbe
      // se il canvas ha già un contesto attivo (es. da Spline)
      try {
        this.renderer.dispose();
      } catch (error) {
        // Ignora errori durante dispose (renderer potrebbe essere già distrutto)
      }
      
      this.renderer = null;
    }

    // 6. Pulisci camera
    if (this.camera) {
      this.camera = null;
    }

    // 7. Pulisci font
    this.font = null;

    // 8. Pulisci THREE reference
    this.THREE = null;
  }
}

