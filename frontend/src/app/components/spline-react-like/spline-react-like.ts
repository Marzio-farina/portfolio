import { 
  Component, 
  ElementRef, 
  ViewChild, 
  OnDestroy, 
  Input,
  AfterViewInit,
  signal,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Spline runtime caricato dinamicamente (lazy loading)
type Application = any; // Sarà caricato dinamicamente

/**
 * Componente Spline che mima il comportamento di @splinetool/react-spline
 * Compatibile con file Spline originali (.splinecode)
 */
@Component({
  selector: 'app-spline-react-like',
  imports: [CommonModule],
  templateUrl: './spline-react-like.html',
  styleUrl: './spline-react-like.css'
})
export class SplineReactLikeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('splineCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrapper') wrapperRef!: ElementRef<HTMLDivElement>;
  
  @Input() scene: string = '';
  @Output() onLoad = new EventEmitter<Application>();
  
  isLoading = signal<boolean>(true);
  
  private app?: Application;
  private mounted = false;
  private resizeObserver?: ResizeObserver;
  
  private readonly DEFAULT_WIDTH = 1200;
  private readonly DEFAULT_HEIGHT = 600;
  private readonly INIT_DELAY = 200; // Aumentato per dare più tempo al DOM
  private readonly DIMENSION_CHECK_DELAY = 100; // Aumentato per stabilità
  private readonly MAX_ATTEMPTS = 50; // Ridotto ma con delay maggiore

  ngAfterViewInit(): void {
    this.mounted = true;
    if (this.scene) {
      setTimeout(() => this.initSpline(), this.INIT_DELAY);
    }
  }

  ngOnDestroy(): void {
    this.mounted = false;
    this.cleanup();
  }

  private async initSpline(): Promise<void> {
    if (!this.isComponentReady()) return;

    try {
      const { canvas, wrapper } = this.getElements();
      
      // Attendi dimensioni valide con retry
      await this.waitForDimensions(wrapper);
      
      // Imposta dimensioni canvas
      this.setCanvasDimensions(canvas, wrapper);
      
      // DOPPIA VERIFICA: assicurati che le dimensioni siano state applicate
      if (canvas.width <= 0 || canvas.height <= 0) {
        console.error('❌ Canvas con dimensioni zero');
        throw new Error('Impossibile impostare dimensioni canvas valide');
      }
      
      // Carica la scena SOLO se canvas valido
      await this.loadSplineScene(canvas);
      
      this.isLoading.set(false);
      this.onLoad.emit(this.app!);
      this.setupResize();
      
    } catch (error) {
      this.handleError('Errore caricamento Spline', error);
    }
  }

  private isComponentReady(): boolean {
    return this.mounted && !!this.canvasRef;
  }

  private getElements(): { canvas: HTMLCanvasElement; wrapper: HTMLDivElement } {
    return {
      canvas: this.canvasRef.nativeElement,
      wrapper: this.wrapperRef.nativeElement
    };
  }

  private async waitForDimensions(wrapper: HTMLDivElement): Promise<void> {
    let attempts = 0;
    
    while (!this.hasValidDimensions(wrapper) && attempts < this.MAX_ATTEMPTS) {
      await this.delay(this.DIMENSION_CHECK_DELAY);
      attempts++;
    }

    if (!this.hasValidDimensions(wrapper)) {
      console.error(
        `❌ Container senza dimensioni valide dopo ${attempts} tentativi`,
        `Dimensioni: ${wrapper.offsetWidth}x${wrapper.offsetHeight}`
      );
    }
  }

  private hasValidDimensions(element: HTMLElement): boolean {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  }

  private setCanvasDimensions(canvas: HTMLCanvasElement, wrapper: HTMLDivElement): void {
    // Assicurati che le dimensioni siano sempre > 0
    let width = wrapper.offsetWidth;
    let height = wrapper.offsetHeight;

    // Fallback a dimensioni minime se non valide
    if (width <= 0 || height <= 0) {
      width = this.DEFAULT_WIDTH;
      height = this.DEFAULT_HEIGHT;
      console.warn('⚠️ Dimensioni wrapper non valide, usando default');
    }

    // Assicura dimensioni minime per WebGL
    canvas.width = Math.max(width, 1);
    canvas.height = Math.max(height, 1);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }

  private async loadSplineScene(canvas: HTMLCanvasElement): Promise<void> {
    // TRIPLA VERIFICA dimensioni valide
    if (canvas.width <= 0 || canvas.height <= 0) {
      throw new Error(`Canvas invalido: ${canvas.width}x${canvas.height}`);
    }

    // Lazy load di Spline runtime - non incluso nel bundle initial!
    const { Application } = await import('@splinetool/runtime');
    
    this.app = new Application(canvas);
    await this.app.load(this.scene);
    
    // Aspetta un frame per permettere a WebGL di stabilizzarsi
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }

  private setupResize(): void {
    if (!this.canResizeSetup()) return;

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.wrapperRef.nativeElement);
  }

  private canResizeSetup(): boolean {
    return !!(this.app && this.canvasRef && this.wrapperRef);
  }

  private handleResize(): void {
    if (!this.canResizeSetup()) return;

    const { canvas, wrapper } = this.getElements();
    let { offsetWidth: width, offsetHeight: height } = wrapper;
    
    // Previeni dimensioni zero che causano errori WebGL
    if (width <= 0 || height <= 0) {
      return; // Non ridimensionare se dimensioni non valide
    }

    // Assicura dimensioni minime
    width = Math.max(width, 1);
    height = Math.max(height, 1);
    
    canvas.width = width;
    canvas.height = height;
    
    this.app!.setSize(width, height);
  }

  private cleanup(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.app = undefined;
  }

  private handleError(message: string, error: unknown): void {
    console.error(`❌ ${message}:`, error);
    this.isLoading.set(false);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getApp(): Application | undefined {
    return this.app;
  }
}

