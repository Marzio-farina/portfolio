import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-skills',
  imports: [],
  templateUrl: './skills.html',
  styleUrl: './skills.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Skills {
  // Dataset radar (valori 0-100)
  skills = signal<RadarSkill[]>([
    { label: 'Communication', value: 78 },
    { label: 'Time Management', value: 70 },
    { label: 'Flexibility & Adaptability', value: 76 },
    { label: 'Analytic & Critical Thinking', value: 68 },
    { label: 'Teamwork & Collaboration', value: 72 },
    { label: 'Decision Making', value: 65 },
    { label: 'Creativity', value: 82 },
    { label: 'Complex Problem Solving', value: 75 },
    { label: 'Curiosity & Lifelong Learning', value: 80 },
    { label: 'Negotiation & Persuasion', value: 58 },
    { label: 'Leadership', value: 67 },
    { label: 'Positive Attitude', value: 74 },
  ]);

  // Parametri SVG
  private readonly size = 420;
  private readonly cx = this.size / 2;
  private readonly cy = this.size / 2;
  private readonly radius = 160;
  private readonly gridSteps = 6;

  axes = computed(() => Array.from({ length: this.skills().length }, (_, i) => i));
  gridRadii = computed(() => Array.from({ length: this.gridSteps }, (_, i) => (this.radius / this.gridSteps) * (i + 1)));

  points = computed(() => {
    const items = this.skills();
    const n = items.length;
    const pts = items.map((s, i) => {
      const angle = -90 + (360 / n) * i; // in gradi
      const r = this.radius * (Math.max(0, Math.min(100, s.value)) / 100);
      const { x, y } = this.polarToCartesian(this.cx, this.cy, r, angle);
      return { x, y };
    });
    return pts;
  });

  polygonPoints = computed(() => this.points().map(p => `${p.x},${p.y}`).join(' '));

  labelPositions = computed(() => {
    const items = this.skills();
    const n = items.length;
    return items.map((s, i) => {
      const angle = -90 + (360 / n) * i;
      const out = this.radius + 26;
      const { x, y } = this.polarToCartesian(this.cx, this.cy, out, angle);
      let anchor: 'start' | 'middle' | 'end' = 'middle';
      if (angle > -90 && angle < 90) anchor = 'start';
      if (angle > 90 || angle < -90) anchor = 'end';
      return { x, y, text: s.label, anchor };
    });
  });

  private polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
}

export interface RadarSkill { label: string; value: number; }
