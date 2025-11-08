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
    <canvas #canvas class="three-canvas" [style.opacity]="visible() ? '1' : '0'"></canvas>
  `,
  styles: [`
    .three-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
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
    // Aspetta che il DOM sia completamente renderizzato
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Carica Three.js in modo lazy
    await this.loadThreeJS();
    
    if (this.THREE) {
      // Aspetta che il canvas abbia dimensioni valide
      await this.waitForValidDimensions();
      await this.initThree();
      this.animate();
      this.setupResize();
      this.isLoading.set(false);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Aggiorna il testo quando cambiano gli input
    if ((changes['title'] || changes['description'] || changes['visible']) && 
        this.font && this.scene && this.THREE) {
      
      const titleText = this.title();
      const descText = this.description();
      const isVisible = this.visible();
      
      // Esegui update async senza bloccare Angular
      this.updateText(titleText, descText, isVisible).catch(() => {
        // Gestione errori silenziosa
      });
    }
  }

  private async waitForValidDimensions(): Promise<void> {
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

  private async initThree() {
    if (!this.THREE) return;
    
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // VERIFICA dimensioni valide prima di inizializzare WebGL
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const THREE = this.THREE;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // Camera ortografica per vista isometrica
    const aspect = rect.width / rect.height;
    const frustumSize = 600;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      1,
      2000
    );
    
    this.camera.position.set(0, 150, 500);
    this.camera.lookAt(0, 150, 0);

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
  }

  private async loadFont() {
    if (!this.THREE) return;

    const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js');
    const loader = new FontLoader();

    return new Promise<void>((resolve) => {
      // Prova prima droid sans (supporta caratteri accentati)
      loader.load(
        'https://threejs.org/examples/fonts/droid/droid_sans_bold.typeface.json',
        (font: any) => {
          this.font = font;
          resolve();
        },
        undefined,
        (error: any) => {
          // Fallback a gentilis se droid non disponibile
          loader.load(
            'https://threejs.org/examples/fonts/gentilis_bold.typeface.json',
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
    this.titleMesh.position.set(-50, 280, 0);  // Spostato più a destra: -100 → -50
    this.titleMesh.rotation.set(-0.3, 0.0, 0.35);
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
        
        const lineHeight = 25;
        descMesh.position.set(-50, 210 - (index * lineHeight), 5 + (index * 2));  // Y ridotto: 230 → 180 (più vicino alla tastiera)
        descMesh.rotation.set(-0.3, 0.0, 0.35);
        
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
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.renderer || !this.scene || !this.camera) return;

    // Animazione più leggera - oscillazione ridotta
    const time = Date.now() * 0.0002;
    
    if (this.titleMesh) {
      this.titleMesh.rotation.x = -0.3 + Math.sin(time) * 0.005;
      this.titleMesh.rotation.z = 0.35;
    }
    
    this.descriptionMeshes.forEach((mesh, index) => {
      mesh.rotation.x = -0.3 + Math.sin(time + 0.5 + index * 0.1) * 0.003;
      mesh.rotation.z = 0.35;
    });

    this.renderer.render(this.scene, this.camera);
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
    const frustumSize = 600;
    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  private cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // NON dispose delle geometrie in cache - saranno riutilizzate
    if (this.titleMesh) {
      this.titleMesh.material.dispose();
    }
    
    this.descriptionMeshes.forEach(mesh => {
      mesh.material.dispose();
    });

    // Dispose cache geometrie solo alla distruzione finale
    this.geometryCache.forEach(geometry => {
      geometry.dispose();
    });
    this.geometryCache.clear();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

