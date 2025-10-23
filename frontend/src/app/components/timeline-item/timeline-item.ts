import { Component, input, signal, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-timeline-item',
  imports: [],
  templateUrl: './timeline-item.html',
  styleUrl: './timeline-item.css'
}) 
export class TimelineItem implements OnInit, OnDestroy {
  title = input.required<string>();
  years = input.required<string>();
  description = input<string>('');

  // Typewriter effect state
  displayedTitle = signal('');
  displayedYears = signal('');
  displayedDescription = signal('');
  isTyping = signal(false);
  
  private typewriterInterval?: number;

  ngOnInit(): void {
    this.startTypewriterEffect();
  }

  ngOnDestroy(): void {
    this.stopTypewriterEffect();
  }

  private startTypewriterEffect(): void {
    const titleText = this.title();
    const yearsText = this.years();
    const descriptionText = this.description();
    
    if (!titleText && !yearsText && !descriptionText) return;
    
    this.isTyping.set(true);
    this.displayedTitle.set('');
    this.displayedYears.set('');
    this.displayedDescription.set('');
    
    let currentIndex = 0;
    const allText = `${titleText} ${yearsText} ${descriptionText}`;
    const typingSpeed = 4; // Velocità molto veloce ma visibile: 4ms tra ogni carattere
    
    this.typewriterInterval = window.setInterval(() => {
      if (currentIndex < allText.length) {
        // Calcola quale campo aggiornare basandosi sulla posizione
        const titleLength = titleText.length;
        const yearsLength = yearsText.length;
        
        if (currentIndex < titleLength) {
          this.displayedTitle.set(titleText.substring(0, currentIndex + 1));
        } else if (currentIndex < titleLength + yearsLength) {
          this.displayedTitle.set(titleText);
          this.displayedYears.set(yearsText.substring(0, currentIndex - titleLength + 1));
        } else {
          this.displayedTitle.set(titleText);
          this.displayedYears.set(yearsText);
          this.displayedDescription.set(descriptionText.substring(0, currentIndex - titleLength - yearsLength + 1));
        }
        
        currentIndex++;
      } else {
        this.isTyping.set(false);
        this.stopTypewriterEffect();
      }
    }, typingSpeed);
  }

  private stopTypewriterEffect(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = undefined;
    }
    this.isTyping.set(false);
  }
}