import { Component, HostListener, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.html',
  styleUrls: ['./card.css']
})
export class Card {
  title = input<string>('');
  description = input<string>('');
  icon = input<string>('');
  clampChars = input<number>(65);               // limite caratteri preview

  // overlay on/off
  overlayOpen = signal(false);

  // serve mostrare "Leggi altro"?
  isTruncatable = computed(() => (this.description()?.length ?? 0) > this.clampChars());

  // testo mostrato nella card (sempre 65 char + … se serve). NON cambia quando l’overlay è aperto
  displayText = computed(() => {
    const full = this.description() ?? '';
    const limit = this.clampChars();
    if (full.length <= limit) return full;

    const cut = full.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    return base.trimEnd() + '…';
  });
}