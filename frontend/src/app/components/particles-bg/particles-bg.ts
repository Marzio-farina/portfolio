import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, effect } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-particles-bg',
  standalone: true,
  templateUrl: './particles-bg.html',
  styleUrl: './particles-bg.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticlesBgComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationId = 0;
  private particles: Particle[] = [];
  private width = 0;
  private height = 0;
  private lineColor = '#333333';
  private dotColor = '#222';
  private lastLineColor = '';
  private lastDotColor = '';
  private mo: MutationObserver | null = null;

  private readonly theme = inject(ThemeService);

  // Reagisce ai cambiamenti del segnale del tema (economico: nessun polling)
  private readonly colorEffect = effect(() => {
    const _mode = this.theme.effectiveTheme();
    this.updateColorsFromCss();
  });

  ngOnInit(): void {
    this.setup();
    this.updateColorsFromCss();
    // Fallback: osserva cambi dell'attributo data-theme sul root
    this.mo = new MutationObserver(() => this.updateColorsFromCss());
    this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    if (this.mo) { this.mo.disconnect(); this.mo = null; }
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.resizeCanvas();
  };

  private setup(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.resizeCanvas();
    this.initParticles();
    this.loop();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.width = canvas.width = window.innerWidth;
    this.height = canvas.height = window.innerHeight;
  }

  private initParticles(): void {
    const count = Math.floor((this.width * this.height) / 20000); // densità adattiva
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 1.5 + 1
    }));
  }

  private loop = () => {
    this.animationId = requestAnimationFrame(this.loop);
    this.ctx.clearRect(0, 0, this.width, this.height);

    // disegna linee
    const linkDistance = 140;
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDistance * linkDistance) {
          const opacity = 0.6 * (1 - d2 / (linkDistance * linkDistance));
          // usa colore tema con opacità dinamica
          this.ctx.strokeStyle = this.withAlpha(this.lineColor, opacity);
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    // aggiorna e disegna particelle
    this.ctx.fillStyle = this.dotColor;
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > this.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.height) p.vy *= -1;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  };

  private updateColorsFromCss(): void {
    const line = this.readVarColorToRgb('--particles-line');
    const dot = this.readVarColorToRgb('--particles-dot');
    const newLine = line || '#333333';
    const newDot  = dot  || '#222222';
    if (newLine !== this.lastLineColor) { this.lineColor = newLine; this.lastLineColor = newLine; }
    if (newDot  !== this.lastDotColor)  { this.dotColor  = newDot;  this.lastDotColor  = newDot; }
  }

  private readVarColorToRgb(varName: string): string {
    const tmp = document.createElement('span');
    tmp.style.color = `var(${varName})`;
    tmp.style.position = 'absolute';
    tmp.style.visibility = 'hidden';
    document.body.appendChild(tmp);
    const rgb = getComputedStyle(tmp).color; // es. "rgb(245, 158, 11)"
    tmp.remove();
    return rgb;
  }

  private withAlpha(hexOrRgb: string, alpha: number): string {
    // se già rgba(...), sostituisci alpha
    if (hexOrRgb.startsWith('rgba')) {
      return hexOrRgb.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${alpha})`);
    }
    if (hexOrRgb.startsWith('rgb')) {
      return hexOrRgb.replace(/rgb\(([^,]+),([^,]+),([^\)]+)\)/, `rgba($1,$2,$3,${alpha})`);
    }
    // hex -> rgba
    const c = hexOrRgb.replace('#','');
    const bigint = parseInt(c.length === 3 ? c.split('').map(x=>x+x).join('') : c, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

interface Particle { x: number; y: number; vx: number; vy: number; r: number; }


