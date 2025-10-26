import { Component, signal } from '@angular/core';

export interface Testimonial {
  id: number;
  author: string;
  text: string;
  role?: string;
  company?: string;
  rating: number;
  icon?: {
    id: number;
    img: string;
    alt: string;
  } | null;
}

@Component({
  selector: 'app-test-component',
  imports: [],
  templateUrl: './test-component.html',
  styleUrl: './test-component.css'
})
export class TestComponent {
  currentSlide = signal(0);
  
  testimonials: Testimonial[] = [
    {
      id: 1,
      author: 'Mario Rossi',
      text: 'Questo è un testimonial molto lungo per verificare come funziona il layout del carosello con testo esteso. Voglio vedere se il contenuto viene gestito correttamente quando ci sono molte parole.',
      role: 'CEO',
      company: 'Tech Company',
      rating: 5,
      icon: {
        id: 1,
        img: 'https://ui-avatars.com/api/?name=Mario+Rossi&background=f97316&color=fff',
        alt: 'Mario Rossi'
      }
    },
    {
      id: 2,
      author: 'Giulia Verdi',
      text: 'Ottimo servizio e grande professionalità. Sono molto soddisfatta del lavoro svolto e lo consiglio vivamente a tutti coloro che cercano qualità e affidabilità.',
      role: 'Designer',
      company: 'Creative Studio',
      rating: 5,
      icon: {
        id: 2,
        img: 'https://ui-avatars.com/api/?name=Giulia+Verdi&background=22c55e&color=fff',
        alt: 'Giulia Verdi'
      }
    },
    {
      id: 3,
      author: 'Luca Bianchi',
      text: 'Esperienza fantastica! Il supporto è stato eccezionale e la qualità del prodotto è superiore alle aspettative. Non posso che raccomandare questo servizio.',
      role: 'Developer',
      company: 'Dev Agency',
      rating: 4,
      icon: {
        id: 3,
        img: 'https://ui-avatars.com/api/?name=Luca+Bianchi&background=a855f7&color=fff',
        alt: 'Luca Bianchi'
      }
    },
    {
      id: 4,
      author: 'Anna Neri',
      text: 'Servizio impeccabile dal punto di vista tecnico e umano. Professionisti competenti e disponibili, sempre pronti a fornire supporto quando necessario.',
      role: 'Product Manager',
      company: 'Startup Inc',
      rating: 5,
      icon: {
        id: 4,
        img: 'https://ui-avatars.com/api/?name=Anna+Neri&background=ef4444&color=fff',
        alt: 'Anna Neri'
      }
    }
  ];

  get slides() {
    return this.testimonials;
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
   * Calcola il numero massimo di slide/pagine considerando le card visibili
   */
  maxSlides(): number {
    const cardsVisible = this.cardsPerView();
    // Se mostra 2 card, ci sono meno pagine
    return Math.max(1, this.slides.length - cardsVisible + 1);
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
}
