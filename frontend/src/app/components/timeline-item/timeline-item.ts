import { Component, input, output, signal, computed, OnDestroy, OnInit, ChangeDetectionStrategy, untracked } from '@angular/core';

@Component({
  selector: 'app-timeline-item',
  imports: [],
  templateUrl: './timeline-item.html',
  styleUrl: './timeline-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush // ⚡ Performance boost
}) 
export class TimelineItem implements OnInit, OnDestroy {
  title = input.required<string>();
  years = input.required<string>();
  description = input<string>('');
  canEdit = input<boolean>(false);
  
  // Output per eliminazione e modifica
  delete = output<void>();
  edit = output<void>();

  // Typewriter effect state
  displayedTitle = signal('');
  displayedYears = signal('');
  displayedDescription = signal('');
  isTyping = signal(false);
  
  // Expand/Collapse state
  isExpanded = signal(false);
  hasBeenHovered = signal(false); // Track se è stato già mostrato
  
  // Pre-processa la descrizione una sola volta (non ad ogni carattere)
  private fullProcessedDescription = signal('');
  processedDescription = computed(() => {
    // Mostra solo la porzione digitata della descrizione già processata
    const typed = this.displayedDescription();
    const full = this.fullProcessedDescription();
    if (!typed || !full) return '';
    
    // Trova l'ultimo tag chiuso valido per evitare HTML rotto
    const typedLength = typed.length;
    let safeHtml = full.substring(0, typedLength);
    
    // Se siamo a metà di un tag, taglia al tag precedente
    const lastOpenTag = safeHtml.lastIndexOf('<');
    const lastCloseTag = safeHtml.lastIndexOf('>');
    if (lastOpenTag > lastCloseTag) {
      safeHtml = safeHtml.substring(0, lastOpenTag);
    }
    
    return safeHtml;
  });
  
  private typewriterInterval?: number;
  private animationFrameId?: number;

  ngOnInit(): void {
    // Mostra solo titolo e anni inizialmente
    this.displayedTitle.set(this.title());
    this.displayedYears.set(this.years());
    
    // Pre-processa la descrizione completa una sola volta
    untracked(() => {
      const desc = this.description();
      if (desc) {
        this.fullProcessedDescription.set(this.processLinks(desc));
      }
    });
  }

  onMouseEnter(): void {
    // All'hover su elementi specifici, mostra la descrizione se non già mostrata
    if (!this.hasBeenHovered()) {
      this.isExpanded.set(true);
      this.hasBeenHovered.set(true);
      this.startDescriptionTypewriter();
    }
  }

  toggleDescription(): void {
    // Toggle manuale con il button (opzionale, se vuoi mantenerlo)
    this.isExpanded.set(!this.isExpanded());
    
    if (this.isExpanded()) {
      // Espandi: mostra descrizione con typewriter
      this.hasBeenHovered.set(true);
      this.startDescriptionTypewriter();
    } else {
      // Collassa: nascondi immediatamente
      this.stopTypewriterEffect();
      this.displayedDescription.set('');
      this.hasBeenHovered.set(false);
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
    const charsPerFrame = 3; // ⚡ Digita 3 caratteri per frame invece di 1
    let lastTimestamp = 0;
    const minFrameTime = 16; // ~60fps
    
    const animate = (timestamp: number) => {
      // Throttle a ~60fps per performance
      if (timestamp - lastTimestamp < minFrameTime) {
        this.animationFrameId = requestAnimationFrame(animate);
        return;
      }
      lastTimestamp = timestamp;
      
      if (currentIndex < descriptionText.length) {
        // Aggiorna 3 caratteri alla volta per meno change detection cycles
        const nextIndex = Math.min(currentIndex + charsPerFrame, descriptionText.length);
        
        // Usa untracked per evitare change detection inutile durante l'animazione
        untracked(() => {
          this.displayedDescription.set(descriptionText.substring(0, nextIndex));
        });
        
        currentIndex = nextIndex;
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.isTyping.set(false);
        this.stopTypewriterEffect();
      }
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopTypewriterEffect(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = undefined;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
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
  
  /**
   * Gestisce il click sul bottone elimina
   */
  onDeleteClick(): void {
    this.delete.emit();
  }
  
  onEditClick(): void {
    if (this.canEdit()) {
      this.edit.emit();
    }
  }
}