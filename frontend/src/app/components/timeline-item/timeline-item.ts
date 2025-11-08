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
  
  // Expand/Collapse state
  isExpanded = signal(false);
  
  // Processed description with clickable links
  processedDescription = computed(() => this.processLinks(this.displayedDescription()));
  
  private typewriterInterval?: number;

  ngOnInit(): void {
    // Mostra solo titolo e anni inizialmente
    this.displayedTitle.set(this.title());
    this.displayedYears.set(this.years());
  }

  toggleDescription(): void {
    this.isExpanded.set(!this.isExpanded());
    
    if (this.isExpanded()) {
      // Espandi: mostra descrizione con typewriter
      this.startDescriptionTypewriter();
    } else {
      // Collassa: nascondi immediatamente
      this.stopTypewriterEffect();
      this.displayedDescription.set('');
    }
  }

  ngOnDestroy(): void {
    this.stopTypewriterEffect();
  }

  private startDescriptionTypewriter(): void {
    const descriptionText = this.description();
    
    if (!descriptionText) return;
    
    this.isTyping.set(true);
    this.displayedDescription.set('');
    
    let currentIndex = 0;
    const typingSpeed = 8; // Velocità 8ms tra ogni carattere
    
    this.typewriterInterval = window.setInterval(() => {
      if (currentIndex < descriptionText.length) {
        this.displayedDescription.set(descriptionText.substring(0, currentIndex + 1));
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