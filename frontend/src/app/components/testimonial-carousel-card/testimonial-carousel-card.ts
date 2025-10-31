import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { TenantService } from '../../services/tenant.service';
import { TestimonialService } from '../../services/testimonial.service';
import { Testimonial } from '../../core/models/testimonial';

@Component({
  selector: 'app-testimonial-carousel-card',
  imports: [Avatar],
  templateUrl: './testimonial-carousel-card.html',
  styleUrls: ['./testimonial-carousel-card.css', './testimonial-carousel-card.responsive.css']
})
export class TestimonialCarouselCard {
  private readonly testimonialApi = inject(TestimonialService);
  private readonly router = inject(Router);
  private readonly tenant = inject(TenantService);

  currentSlide = signal(0);
  
  // Testimonials data from API
  testimonials = signal<Testimonial[]>([]);
  testimonialsLoading = signal(true);
  testimonialsError = signal<string | null>(null);
  
  // Dialog state
  dialogOpen = signal<boolean>(false);
  displayedText = signal<string>('');
  isTyping = signal<boolean>(false);
  selectedTestimonial = signal<Testimonial | null>(null);
  private typewriterInterval: any;
  private initialText = '';

  constructor() {
    this.loadTestimonials();
    // Ricarica su cambio tenant
    const t = this.tenant;
    queueMicrotask(() => {
      const effectRef = (window as any).ngEffect?.(() => {
        void t.userId();
        this.loadTestimonials();
      });
    });
  }

  get slides() {
    return this.testimonials();
  }

  /**
   * Load testimonials data from API
   */
  private loadTestimonials(): void {
    this.testimonialsLoading.set(true);
    const uid = this.tenant.userId();
    this.testimonialApi.list$(1, 8, uid ?? undefined).subscribe({
      next: response => {
        this.testimonials.set(response.data ?? []);
        this.testimonialsLoading.set(false);
      },
      error: () => {
        this.testimonialsError.set('Impossibile caricare le testimonianze.');
        this.testimonialsLoading.set(false);
      }
    });
  }

  /**
   * Numero di card visibili in base alla larghezza dello schermo
   */
  cardsPerView(): number {
    // Extra Large (≥1250px): 3 card
    // Tablet/Desktop (≥820px): 2 card
    // Mobile (<820px): 1 card
    if (window.innerWidth >= 1250) return 3;
    if (window.innerWidth >= 820) return 2;
    return 1;
  }

  /**
   * Calcola la posizione di traslazione per mostrare lo slide corrente
   */
  getTransform(): string {
    const cardsVisible = this.cardsPerView();
    const translatePercent = 100 / cardsVisible;
    return `translateX(-${this.currentSlide() * translatePercent}%)`;
  }

  /**
   * Verifica se uno slide è attivo
   */
  isActive(index: number): boolean {
    return this.currentSlide() === index;
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
  }

  /**
   * Tronca il nome dell'autore a massimo 10 caratteri con ellipsis
   */
  truncateAuthor(author: string, maxLength: number = 10): string {
    if (!author || author.length <= maxLength) return author;
    return author.slice(0, maxLength) + '…';
  }

  /**
   * Calcola il numero massimo di slide/pagine considerando le card visibili
   */
  maxSlides(): number {
    const cardsVisible = this.cardsPerView();
    const slides = this.slides;
    return Math.max(1, slides.length - cardsVisible + 1);
  }

  nextSlide(): void {
    const max = this.maxSlides();
    const next = this.currentSlide() + 1;
    if (next < max) {
      this.currentSlide.set(next);
    }
  }

  prevSlide(): void {
    const prev = this.currentSlide() - 1;
    if (prev >= 0) {
      this.currentSlide.set(prev);
    }
  }

  /**
   * Open dialog with testimonial details
   */
  openDialog(testimonial: Testimonial): void {
    this.dialogOpen.set(true);
    this.selectedTestimonial.set(testimonial);
    this.initialText = testimonial.text;
    this.displayedText.set('');
    this.startTypewriterEffect();
  }

  /**
   * Close dialog
   */
  closeDialog(): void {
    this.dialogOpen.set(false);
    this.stopTypewriterEffect();
    this.displayedText.set('');
    this.selectedTestimonial.set(null);
  }

  /**
   * Start typewriter effect
   */
  private startTypewriterEffect(): void {
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
    }, 30);
  }

  /**
   * Stop typewriter effect
   */
  private stopTypewriterEffect(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.isTyping.set(false);
  }

  /**
   * Get avatar data for dialog
   */
  getAvatarData(testimonial: Testimonial) {
    if (!testimonial.icon && !testimonial.avatar) return null;
    
    // Se c'è un'icona, usa quella
    if (testimonial.icon) {
      const url = this.normalizeAvatarUrl(testimonial.icon.img);
      if (!this.isValidImageUrl(url)) return null;
      return {
        id: testimonial.icon.id,
        img: url,
        alt: testimonial.icon.alt
      };
    }
    
    // Altrimenti usa l'avatar diretto se disponibile
    if (testimonial.avatar) {
      const url = this.normalizeAvatarUrl(testimonial.avatar);
      if (!this.isValidImageUrl(url)) return null;
      return {
        id: 0,
        img: url,
        alt: testimonial.author
      };
    }
    
    return null;
  }

  /**
   * Verifica che l'URL punti ragionevolmente a un file immagine
   */
  private isValidImageUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    // Evita URL monchi come .../storage/ o .../storage
    if (/\/storage\/?$/.test(trimmed)) return false;
    // Deve terminare con un'estensione immagine
    return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(trimmed);
  }

  /**
   * Normalizza gli URL degli avatar per usare il backend
   */
  private normalizeAvatarUrl(url: string): string {
    if (!url) return url;
    
    // Se è già un URL assoluto (https:// o http://), lo mantiene così com'è
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Se inizia con storage/, costruisce l'URL del backend SENZA /api/
    if (url.startsWith('storage/')) {
      const apiUrl = this.getApiBaseUrl();
      return `${apiUrl}/${url}`;
    }
    
    // Se è relativo, aggiunge il path al backend
    const apiUrl = this.getApiBaseUrl();
    return `${apiUrl}/${url}`;
  }

  /**
   * Ottiene l'URL base dell'API
   */
  private getApiBaseUrl(): string {
    // In produzione usa l'API reale, in locale usa localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    return 'https://api.marziofarina.it';
  }

  /**
   * Handle mouse enter on card
   */
  onMouseEnter(): void {
    // Puoi aggiungere effetti hover se necessario
  }

  /**
   * Handle mouse leave on card
   */
  onMouseLeave(): void {
    // Puoi aggiungere effetti hover se necessario
  }

  /**
   * Convert vertical wheel scroll to horizontal carousel navigation
   */
  onWheelToHorizontal(event: WheelEvent): void {
    // Previene lo scroll verticale di default
    event.preventDefault();

    // Converti il movimento verticale della rotellina in movimento orizzontale
    const deltaY = event.deltaY;
    
    // Verifica che lo scroll sia principalmente verticale (non orizzontale)
    if (Math.abs(deltaY) > Math.abs(event.deltaX)) {
      // Determina la direzione
      if (deltaY > 0) {
        // Scorri verso il basso -> vai avanti nel carosello
        this.nextSlide();
      } else {
        // Scorri verso l'alto -> vai indietro nel carosello
        this.prevSlide();
      }
    }
  }

    /**
   * Navigate to add testimonial page
   * Se c'è uno userSlug, naviga al path specifico per utente
   */
    openAddTestimonial(): void {
        const userSlug = this.tenant.userSlug();
        const navigateTo = userSlug ? [`/${userSlug}/nuova-recensione`] : ['/nuova-recensione'];
        this.router.navigate(navigateTo);
    }
}

