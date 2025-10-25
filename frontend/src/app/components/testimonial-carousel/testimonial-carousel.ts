import { Component, ElementRef, inject, signal, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';

import { Avatar } from '../avatar/avatar';
import { TestimonialCard } from '../testimonial-card/testimonial-card';
import { Testimonial } from '../../core/models/testimonial';
import { TestimonialService } from '../../services/testimonial.service';

/**
 * Testimonial Carousel Component
 * 
 * Displays a horizontal scrolling carousel of testimonials.
 * Features wheel-to-horizontal scroll conversion and hover effects.
 */
@Component({
  selector: 'app-testimonial-carousel',
  imports: [
    Avatar,
    TestimonialCard
  ],
  templateUrl: './testimonial-carousel.html',
  styleUrl: './testimonial-carousel.css'
})
export class TestimonialCarousel implements AfterViewInit {
  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly router = inject(Router);
  private readonly testimonialApi = inject(TestimonialService);

  // ========================================================================
  // View References
  // ========================================================================

  /** Reference to carousel element for horizontal scrolling */
  @ViewChild('carousel') private carouselRef?: ElementRef<HTMLElement>;

  // ========================================================================
  // Hover State Management
  // ========================================================================

  /** ID of the currently hovered testimonial */
  private hoveredTestimonialIdSignal = signal<string | null>(null);

  // ========================================================================
  // Properties
  // ========================================================================

  // Testimonials section
  testimonials = signal<Testimonial[]>([]);
  testimonialsLoading = signal(true);
  testimonialsError = signal<string | null>(null);
  page = signal(1);
  perPage = signal(8);
  lastPage = signal(1);

  // Carousel navigation state
  canScrollPrev = signal(false);
  canScrollNext = signal(true);

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.loadTestimonials();
  }

  /**
   * Initialize carousel after view init
   */
  ngAfterViewInit(): void {
    // Inizializza gli stati dei pulsanti dopo che la view è stata creata
    setTimeout(() => {
      this.updateNavigationState();
    }, 100);
  }

  // ========================================================================
  // Public Methods
  // ========================================================================

  /**
   * Navigate to next testimonials page
   */
  next(): void {
    if (this.page() < this.lastPage()) {
      this.page.set(this.page() + 1);
      this.loadTestimonials();
    }
  }

  /**
   * Navigate to previous testimonials page
   */
  prev(): void {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.loadTestimonials();
    }
  }

  /**
   * Handle wheel event to enable horizontal scrolling
   * Converts vertical scroll to horizontal scroll for carousel
   * 
   * @param event Wheel event
   */
  onWheelToHorizontal(event: WheelEvent): void {
    const element = this.carouselRef?.nativeElement;
    if (!element) return;

    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault?.();
      element.scrollBy({ left: event.deltaY });
    }
  }

  /**
   * Scroll to previous slide
   */
  scrollToPrevious(): void {
    const element = this.carouselRef?.nativeElement;
    if (!element) return;

    const containerWidth = element.clientWidth;
    const currentScrollLeft = element.scrollLeft;
    
    // Calcola la posizione target: scrolla di una larghezza di container
    const targetScrollLeft = Math.max(0, currentScrollLeft - containerWidth);
    
    element.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    });
  }

  /**
   * Scroll to next slide
   */
  scrollToNext(): void {
    const element = this.carouselRef?.nativeElement;
    if (!element) return;

    const containerWidth = element.clientWidth;
    const currentScrollLeft = element.scrollLeft;
    const maxScrollLeft = element.scrollWidth - containerWidth;
    
    // Calcola la posizione target: scrolla di una larghezza di container
    const targetScrollLeft = Math.min(maxScrollLeft, currentScrollLeft + containerWidth);
    
    element.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    });
  }

  /**
   * Handle scroll event to update navigation state
   */
  onScroll(): void {
    const element = this.carouselRef?.nativeElement;
    if (!element) return;

    const scrollLeft = element.scrollLeft;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    
    // Aggiungi una piccola tolleranza per evitare flickering
    const tolerance = 5;
    
    this.canScrollPrev.set(scrollLeft > tolerance);
    this.canScrollNext.set(scrollLeft < maxScrollLeft - tolerance);
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Load testimonials data from API
   */
  private loadTestimonials(): void {
    this.testimonialsLoading.set(true);
    this.testimonialApi.list$(this.page(), this.perPage()).subscribe({
      next: response => {
        this.testimonials.set(response.data ?? []);
        this.lastPage.set(response.meta?.last_page ?? 1);
        this.testimonialsLoading.set(false);
        // Aggiorna gli stati dei pulsanti dopo aver caricato i dati
        setTimeout(() => {
          this.updateNavigationState();
        }, 100);
      },
      error: () => {
        this.testimonialsError.set('Impossibile caricare le testimonianze.');
        this.testimonialsLoading.set(false);
      }
    });
  }

  /**
   * Update navigation button states
   */
  private updateNavigationState(): void {
    const element = this.carouselRef?.nativeElement;
    if (!element) return;

    const scrollLeft = element.scrollLeft;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const tolerance = 5;
    
    this.canScrollPrev.set(scrollLeft > tolerance);
    this.canScrollNext.set(scrollLeft < maxScrollLeft - tolerance);
  }

  // ========================================================================
  // Hover Event Handlers
  // ========================================================================

  /**
   * Handle testimonial hover start
   */
  onTestimonialHoverStart(testimonialId: string): void {
    this.hoveredTestimonialIdSignal.set(testimonialId);
  }

  /**
   * Handle testimonial hover end
   */
  onTestimonialHoverEnd(): void {
    this.hoveredTestimonialIdSignal.set(null);
  }

  /**
   * Get the currently hovered testimonial ID for template
   */
  get hoveredTestimonialId() {
    return this.hoveredTestimonialIdSignal();
  }

  /**
   * Navigate to add testimonial page
   */
  openAddTestimonial(): void {
    this.router.navigate(['/nuova-recensione']);
  }
}