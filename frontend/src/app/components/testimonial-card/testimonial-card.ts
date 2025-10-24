import { Component, computed, input, output } from '@angular/core';
import { Avatar } from '../avatar/avatar';

@Component({
  selector: 'app-testimonial-card',
  imports: [
    Avatar
  ],
  templateUrl: './testimonial-card.html',
  styleUrl: './testimonial-card.css'
})
export class TestimonialCard {
  author = input<string>('');
  text = input<string>('');
  role = input<string>('');
  company = input<string>('');
  rating = input<number, number | undefined>(5,{ transform: v => v ?? 5 });
  clampChars = input<number>(65);
  
  // Eventi per comunicare con il componente padre
  onHoverStart = output<void>();
  onHoverEnd = output<void>();

  // testo mostrato nella card (sempre 65 char + … se serve). NON cambia quando l’overlay è aperto
  displayText = computed(() => {
    const full = this.text()?.trim() ?? '';
    const limit = this.clampChars();
    if (full.length <= limit) return full;

    const cut = full.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    return base.trimEnd() + '…';
  });

  openModal(dlg: HTMLDialogElement) {
    // evita che il click propaghi e riapra
    dlg?.showModal();
  }

  onMouseEnter() {
    this.onHoverStart.emit();
  }

  onMouseLeave() {
    this.onHoverEnd.emit();
  }
}
