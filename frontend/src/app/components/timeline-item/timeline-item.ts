import { Component, input, signal, computed, OnDestroy, OnInit } from '@angular/core';

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
  
  // Processed description with clickable links
  processedDescription = computed(() => this.processLinks(this.displayedDescription()));
  
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
    const typingSpeed = 8; // Velocità 8ms tra ogni carattere
    
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

  private processLinks(text: string): string {
    if (!text) return '';
    
    // Regex per rilevare URL (http/https) - si ferma a spazi e chiusura parentesi
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    
    return text.replace(urlRegex, (url) => {
      // Gestione speciale per GitHub
      if (url.includes('github.com')) {
        const parts = url.replace(/^https?:\/\//, '').split('/');
        if (parts.length >= 3) {
          const repoName = parts[2]; // Nome del repository
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="tli__link">${repoName}</a>`;
        }
      }
      
      // Estrai il nome del sito dal dominio per altri URL
      const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const siteName = domain.split('.')[0];
      
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="tli__link">${siteName}</a>`;
    });
  }
}