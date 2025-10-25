import { Component, computed, input, output, signal } from '@angular/core';
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

  // Stato del dialog
  dialogOpen = signal<boolean>(false);
  
  // Stato per l'effetto typewriter
  displayedText = signal<string>('');
  isTyping = signal<boolean>(false);
  private typewriterInterval: any;
  private initialText = '';

  // testo mostrato nella card (sempre 65 char + … se serve). NON cambia quando l'overlay è aperto
  displayText = computed(() => {
    const full = this.text()?.trim() ?? '';
    const limit = this.clampChars();
    if (full.length <= limit) return full;

    const cut = full.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    return base.trimEnd() + '…';
  });

  openDialog() {
    this.dialogOpen.set(true);
    this.initialText = this.text();
    this.displayedText.set('');
    this.startTypewriterEffect();
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.stopTypewriterEffect();
    this.displayedText.set('');
  }

  startTypewriterEffect() {
    const fullText = this.initialText;
    let currentIndex = 0;
    this.isTyping.set(true);

    this.typewriterInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        this.displayedText.set(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        this.stopTypewriterEffect();
      }
    }, 30); // Velocità: 30ms per carattere
  }

  stopTypewriterEffect() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.isTyping.set(false);
  }

  onMouseEnter() {
    this.onHoverStart.emit();
  }

  onMouseLeave() {
    this.onHoverEnd.emit();
  }
}
