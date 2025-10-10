import { Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.css'
})
export class Card {
  title = input<string>('');
  description = input<string>('');
  icon = input<string>('');
  maxLength = input<number>(90);

  expanded = signal(false);
  isTruncatable = computed(() => (this.description()?.length ?? 0) > this.maxLength());

  displayText = computed(() => {
    const text = this.description() ?? '';
    const limit = this.maxLength();
    if (this.expanded() || text.length <= limit) return text;
    return this.softTruncate(text, limit);
  });

  toggleExpand() {
    this.expanded.update(v => !v);
  }

  private softTruncate(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    return base.trimEnd() + '…';
  }
}
