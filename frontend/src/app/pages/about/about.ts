import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { Avatar } from '../../components/avatar/avatar';
import { TestimonialCard } from '../../components/testimonial-card/testimonial-card';
import { WhatIDoCard } from '../../components/what-i-do-card/what-i-do-card';
import { Bio } from '../../components/bio/bio';
import { Testimonial } from '../../core/models/testimonial';
import { TestimonialService } from '../../services/testimonial.service';
import { WhatIDoService } from '../../services/what-i-do.service';
import { ProfileService, ProfileData } from '../../services/profile.service';

// ========================================================================
// Interfaces
// ========================================================================

interface AboutCard {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

/**
 * About Page Component
 * 
 * Displays personal information, skills, and testimonials.
 * Features horizontal scrolling carousel for testimonials.
 */
@Component({
  selector: 'app-about',
  imports: [
    WhatIDoCard,
    Avatar,
    TestimonialCard,
    Bio
  ],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly testimonialApi = inject(TestimonialService);
  private readonly whatIDoApi = inject(WhatIDoService);
  private readonly profileApi = inject(ProfileService);

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

  /** Page title from route data */
  title = toSignal(
    this.route.data.pipe(map(data => data['title'] as string)), 
    { initialValue: '' }
  );

  // What I Do section
  cards = signal<AboutCard[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  // Testimonials section
  testimonials = signal<Testimonial[]>([]);
  testimonialsLoading = signal(true);
  testimonialsError = signal<string | null>(null);
  page = signal(1);
  perPage = signal(8);
  lastPage = signal(1);

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.loadWhatIDoData();
    this.loadTestimonials();
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
   * Track function for ngFor optimization
   * 
   * @param index Item index
   * @param card About card item
   * @returns Unique identifier
   */
  trackById = (_: number, card: AboutCard) => card.id;

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

  // ========================================================================
  // Private Methods
  // ========================================================================


  /**
   * Load "What I Do" data from API
   */
  private loadWhatIDoData(): void {
    this.whatIDoApi.get$().subscribe({
      next: items => {
        this.cards.set(items.map(item => ({
          id: String(item.id),
          title: item.title,
          description: item.description,
          icon: item.icon
        })));
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Impossibile caricare le card.');
        this.loading.set(false);
      }
    });
  }

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
      },
      error: () => {
        this.testimonialsError.set('Impossibile caricare le testimonianze.');
        this.testimonialsLoading.set(false);
      }
    });
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
