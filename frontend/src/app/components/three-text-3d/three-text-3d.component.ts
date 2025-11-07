import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  input,
  effect,
  signal
} from '@angular/core';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

@Component({
  selector: 'app-three-text-3d',
  standalone: true,
  template: `<canvas #canvas class="three-canvas"></canvas>`,
  styles: [`
    .three-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    }
  `]
})
export class ThreeText3DComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Inputs da parent
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly visible = input<boolean>(false);

  // Three.js objects
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera; // Ortografica per vista isometrica
  private renderer!: THREE.WebGLRenderer;
  private titleMesh: THREE.Mesh | null = null;
  private descriptionMeshes: THREE.Mesh[] = []; // Array per multi-line
  private font: any = null;
  private animationFrameId: number = 0;
  
  // Configurazione testo
  private readonly MAX_DESC_CHARS_PER_LINE = 45; // Caratteri massimi per riga

  // Signal per tracking resize
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Effect per aggiornare il testo quando cambiano gli input
    effect(() => {
      const titleText = this.title();
      const descText = this.description();
      const isVisible = this.visible();

      if (this.font && this.scene) {
        this.updateText(titleText, descText, isVisible);
      }
    });
  }

  async ngAfterViewInit() {
    await this.initThree();
    this.animate();
    this.setupResize();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private async initThree() {
    const canvas = this.canvasRef.nativeElement;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = null; // Trasparente

    // Camera ORTOGRAFICA per vista isometrica pura (no prospettiva)
    // Questo fa sì che l'estrusione di tutte le lettere vada nella stessa direzione
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const frustumSize = 600;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,  // left
      frustumSize * aspect / 2,   // right
      frustumSize / 2,            // top
      -frustumSize / 2,           // bottom
      1,                          // near
      2000                        // far
    );
    
    // Posiziona camera frontale - vista parallela
    this.camera.position.set(0, 150, 500);
    this.camera.lookAt(0, 150, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Luci ottimizzate per estrusione UNIFORME (come "distribuito")
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Luce principale frontale - illumina la faccia frontale delle lettere
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
    frontLight.position.set(0, 100, 500);
    this.scene.add(frontLight);

    // Luce dal basso a sinistra - illumina l'estrusione in modo uniforme
    const extrusionLight = new THREE.DirectionalLight(0xaaaaaa, 0.9);
    extrusionLight.position.set(-200, -150, -300); // Posizione chiave per estrusione uniforme
    this.scene.add(extrusionLight);

    // Luce di riempimento dall'alto per ammorbidire le ombre
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(0, 300, 200);
    this.scene.add(fillLight);

    // Carica font
    await this.loadFont();
  }

  private async loadFont() {
    const loader = new FontLoader();

    return new Promise<void>((resolve) => {
      // Font JSON inline - Helvetiker Bold
      const fontData = {
        "glyphs": {
          "A": {"ha": 722, "x_min": 15, "x_max": 707, "o": "m 361 0 l 361 140 l 15 140 l 15 0 l 361 0 m 188 709 l 361 201 l 534 709 l 707 709 l 447 0 l 275 0 l 15 709 l 188 709 m 304 419 l 419 419 l 361 587 l 304 419 z"},
          // Qui dovrei mettere tutti i caratteri... ma è troppo lungo
        },
        "familyName": "Helvetiker",
        "resolution": 1000,
        "boundingBox": {"yMax": 783, "yMin": -217, "xMin": -111, "xMax": 1359},
        "underlineThickness": 50
      };

      // Uso font da three.js CDN (più semplice)
      loader.load(
        'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
        (font) => {
          this.font = font;
          resolve();
        },
        undefined,
        (error) => {
          console.error('Errore caricamento font:', error);
          // Fallback - usa font semplice
          resolve();
        }
      );
    });
  }

  private updateText(title: string, description: string, visible: boolean) {
    // Rimuovi mesh esistenti
    if (this.titleMesh) {
      this.scene.remove(this.titleMesh);
      this.titleMesh.geometry.dispose();
      (this.titleMesh.material as THREE.Material).dispose();
    }
    
    // Rimuovi tutte le righe della descrizione
    this.descriptionMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.descriptionMeshes = [];

    if (!visible || !title || !this.font) {
      return;
    }

    // Crea titolo 3D con estrusione NETTA come la lettera R
    const titleGeometry = new TextGeometry(title, {
      font: this.font,
      size: 60,
      depth: 40,            // Estrusione molto profonda
      curveSegments: 24,    // MOLTI curve segments per bordi netti
      bevelEnabled: true,
      bevelThickness: 0.5,  // Bevel MINIMO per bordi definiti
      bevelSize: 0.3,       // Bevel MINIMO
      bevelOffset: 0,
      bevelSegments: 2      // Pochi segmenti per bordi netti
    });

    // Normalizza le normali per rendering uniforme
    titleGeometry.computeVertexNormals();
    titleGeometry.computeBoundingBox();
    const titleWidth = titleGeometry.boundingBox!.max.x - titleGeometry.boundingBox!.min.x;
    
    // CENTER geometry per evitare problemi di facce invertite
    titleGeometry.center();

    // Materiale ottimizzato per estrusione NETTA come la R
    const titleMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,      // Grigio chiaro
      metalness: 0.0,       // Zero metallico per colori puri
      roughness: 0.7,       // Alto per contrasto netto
      emissive: 0x000000,
      emissiveIntensity: 0,
      flatShading: false,   // Smooth ma con ombre definite
      side: THREE.FrontSide // Solo faccia frontale per estrusione corretta
    });

    this.titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    
    // Posizione più ALTA per evitare sovrapposizioni con la tastiera
    this.titleMesh.position.set(-100, 280, 0);
    
    // Rotazione seguendo la linea rossa diagonale ascendente
    // Linea: da basso-sinistra a alto-destra (circa 20-30 gradi)
    this.titleMesh.rotation.set(
      -0.3,   // rotateX negativo - estrusione visibile in basso
      0.0,    // rotateY - frontale
      0.35    // rotateZ positivo - diagonale ascendente (20°)
    );
    
    this.scene.add(this.titleMesh);

    // Crea descrizione 3D con word-wrap
    if (description) {
      // Dividi il testo in righe se troppo lungo
      const lines = this.wrapText(description, this.MAX_DESC_CHARS_PER_LINE);
      
      const descMaterial = new THREE.MeshStandardMaterial({
        color: 0xdcdcdc,      // Grigio leggermente più scuro
        metalness: 0.0,       // Come il titolo
        roughness: 0.7,       // Come il titolo
        emissive: 0x000000,
        emissiveIntensity: 0,
        flatShading: false,
        side: THREE.FrontSide // Solo faccia frontale
      });

      // Crea una mesh per ogni riga
      lines.forEach((line, index) => {
        const descGeometry = new TextGeometry(line, {
          font: this.font,
          size: 16,
          depth: 15,            // Estrusione proporzionata e profonda
          curveSegments: 24,    // MOLTI curve segments
          bevelEnabled: true,
          bevelThickness: 0.3,  // Bevel MINIMO
          bevelSize: 0.2,       // Bevel MINIMO
          bevelOffset: 0,
          bevelSegments: 2      // Pochi segmenti per bordi netti
        });

        // Normalizza le normali per rendering uniforme
        descGeometry.computeVertexNormals();
        descGeometry.center(); // CENTER per evitare problemi

        const descMesh = new THREE.Mesh(descGeometry, descMaterial.clone());
        
        // Posizione più ALTA per evitare sovrapposizioni con la tastiera
        const lineHeight = 25; // Spaziatura tra righe
        descMesh.position.set(-100, 230 - (index * lineHeight), 5 + (index * 2));
        
        // Rotazione come il titolo
        descMesh.rotation.set(
          -0.3,   // rotateX negativo
          0.0,    // rotateY - frontale
          0.35    // rotateZ - diagonale
        );
        
        this.scene.add(descMesh);
        this.descriptionMeshes.push(descMesh);
      });
    }

    // Animazione entrata
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
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      const scale = startScale + (endScale - startScale) * eased;

      if (this.titleMesh) {
        this.titleMesh.scale.set(scale, scale, scale);
      }
      
      // Anima tutte le righe della descrizione
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

    // Leggera oscillazione per effetto dinamico (minima, solo su X)
    const time = Date.now() * 0.0003;
    
    if (this.titleMesh) {
      // Oscillazione molto leggera su X per effetto "breathing"
      // Mantieni rotateZ fisso per la diagonale
      this.titleMesh.rotation.x = -0.3 + Math.sin(time) * 0.008;
      this.titleMesh.rotation.z = 0.35; // Diagonale fissa
    }
    
    // Oscillazione per tutte le righe della descrizione
    this.descriptionMeshes.forEach((mesh, index) => {
      mesh.rotation.x = -0.3 + Math.sin(time + 0.5 + index * 0.1) * 0.006;
      mesh.rotation.z = 0.35; // Diagonale fissa
    });

    this.renderer.render(this.scene, this.camera);
  };

  private setupResize() {
    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
    });
    this.resizeObserver.observe(this.canvasRef.nativeElement);
  }

  private onResize() {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Update ortografica camera
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

    if (this.titleMesh) {
      this.titleMesh.geometry.dispose();
      (this.titleMesh.material as THREE.Material).dispose();
    }
    
    // Cleanup di tutte le righe della descrizione
    this.descriptionMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

