import { Component, signal, OnDestroy, inject } from '@angular/core';
import { ProfileService, ProfileData } from '../../services/profile.service';
import { Nl2brPipe } from '../../pipes/nl2br.pipe';

@Component({
  selector: 'app-bio',
  imports: [Nl2brPipe],
  templateUrl: './bio.html',
  styleUrl: './bio.css'
})
export class Bio implements OnDestroy {
  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly profileApi = inject(ProfileService);

  // ========================================================================
  // Properties
  // ========================================================================

  // Profile section
  profile = signal<ProfileData | null>(null);
  profileLoading = signal(true);
  profileError = signal<string | null>(null);

  // Bio dialog state
  bioDialogOpen = signal(false);
  
  // Typewriter effect state
  displayedText = signal(''); // Per desktop
  isTyping = signal(false); // Per desktop
  initialText = signal(''); // Testo iniziale visibile nel riquadro mobile

  // Mobile dialog state
  mobileDialogText = signal(''); // Testo per il dialog mobile
  isMobileTyping = signal(false); // Stato typewriter per mobile
  
  // Typewriter interval
  private typewriterInterval?: number;
  private mobileTypewriterInterval?: number;
  private resizeListener?: () => void;

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.loadProfileData();
    this.addResizeListener();
  }

  // ========================================================================
  // Public Methods
  // ========================================================================

  /**
   * Open bio dialog on mobile
   */
  openBioDialog(): void {
    this.bioDialogOpen.set(true);
    this.startMobileTypewriterEffect();
  }

  /**
   * Close bio dialog
   */
  closeBioDialog(event: Event): void {
    event.stopPropagation(); // Previene la chiusura quando si clicca sul dialog
    this.bioDialogOpen.set(false);
    this.stopTypewriterEffect();
    // Reset delle variabili mobile
    this.mobileDialogText.set('');
    this.isMobileTyping.set(false);
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Load profile data from API
   */
  private loadProfileData(): void {
    this.profileApi.getProfile$().subscribe({
      next: (data) => {
        this.profile.set(data ?? null);
        this.profileLoading.set(false);
        
        // Imposta il testo per tutti i dispositivi
        if (data?.bio) {
          this.startTypewriterEffectForAllDevices(data.bio);
        }
      },
      error: () => {
        this.profileError.set('Impossibile caricare il profilo.');
        this.profileLoading.set(false);
      }
    });
  }

  /**
   * Start typewriter effect for desktop when data loads
   */
  private startTypewriterEffectForAllDevices(bioText: string): void {
    if (!bioText) return;

    // Calcola testo iniziale per mobile
    const maxVisibleChars = this.calculateVisibleChars(bioText);
    this.initialText.set(bioText.substring(0, maxVisibleChars));

    // Inizia typewriter per desktop - reset e avvia da vuoto
    this.displayedText.set('');
    this.isTyping.set(true);

    let currentIndex = 0;
    const typingSpeed = 1; // Velocità 1ms tra ogni carattere

    this.typewriterInterval = window.setInterval(() => {
      if (currentIndex < bioText.length) {
        this.displayedText.set(bioText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        this.isTyping.set(false);
        this.stopTypewriterEffect();
      }
    }, typingSpeed);
  }

  /**
   * Start typewriter effect for mobile dialog
   */
  private startMobileTypewriterEffect(): void {
    const bioText = this.profile()?.bio || '';
    if (!bioText) return;

    // Reset per il dialog mobile - usa variabili separate
    this.mobileDialogText.set('');
    this.isMobileTyping.set(true);

    let currentIndex = 0;
    const typingSpeed = 8; // Velocità 8ms tra ogni carattere

    this.mobileTypewriterInterval = window.setInterval(() => {
      if (currentIndex < bioText.length) {
        this.mobileDialogText.set(bioText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        this.isMobileTyping.set(false);
        this.stopTypewriterEffect();
      }
    }, typingSpeed);
  }

  /**
   * Calculate how many characters are visible in contracted bio card based on actual dimensions
   */
  private calculateVisibleChars(text: string): number {
    // Crea un elemento temporaneo per misurare il testo
    const tempElement = document.createElement('div');
    tempElement.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: 100%;
      font-size: 0.9rem;
      line-height: 1.6;
      padding: 1rem;
      font-family: var(--ff-poppins);
      word-wrap: break-word;
      white-space: normal;
    `;
    
    // Aggiungi al DOM temporaneamente
    document.body.appendChild(tempElement);
    
    // Calcola l'altezza del riquadro contratto (200px) meno padding
    const bioCardHeight = 200;
    const padding = 32; // 1rem top + 1rem bottom
    const availableHeight = bioCardHeight - padding;
    
    // Prova con lunghezze diverse fino a trovare quella che rientra nell'altezza
    let maxChars = text.length;
    let low = 0;
    let high = text.length;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testText = text.substring(0, mid);
      tempElement.textContent = testText;
      
      if (tempElement.offsetHeight <= availableHeight) {
        maxChars = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    // Rimuovi l'elemento temporaneo
    document.body.removeChild(tempElement);
    
    // Trova l'ultimo spazio prima del limite per non tagliare le parole
    if (maxChars >= text.length) {
      return text.length;
    }
    
    const lastSpaceIndex = text.lastIndexOf(' ', maxChars);
    return lastSpaceIndex > 0 ? lastSpaceIndex : maxChars;
  }

  /**
   * Stop typewriter effect
   */
  private stopTypewriterEffect(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = undefined;
    }
    if (this.mobileTypewriterInterval) {
      clearInterval(this.mobileTypewriterInterval);
      this.mobileTypewriterInterval = undefined;
    }
    this.isTyping.set(false);
  }

  /**
   * Add resize listener to recalculate text when window size changes
   */
  private addResizeListener(): void {
    this.resizeListener = () => {
      // Ricalcola il testo iniziale quando cambia la dimensione della finestra
      const bioText = this.profile()?.bio;
      if (bioText) {
        const maxVisibleChars = this.calculateVisibleChars(bioText);
        this.initialText.set(bioText.substring(0, maxVisibleChars));
      }
    };
    
    window.addEventListener('resize', this.resizeListener);
  }

  /**
   * Remove resize listener
   */
  private removeResizeListener(): void {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }
  }

  /**
   * Cleanup when component is destroyed
   */
  ngOnDestroy(): void {
    this.stopTypewriterEffect();
    this.removeResizeListener();
  }
}