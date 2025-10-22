import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { Avatar } from '../../components/avatar/avatar';
import { TestimonialCard } from '../../components/testimonial-card/testimonial-card';
import { WhatIDoCard } from '../../components/what-i-do-card/what-i-do-card';
import { Testimonial } from '../../core/models/testimonial';
import { TestimonialService } from '../../services/testimonial.service';
import { WhatIDoService } from '../../services/what-i-do.service';
import { ProfileService, ProfileData } from '../../services/profile.service';
import { Nl2brPipe } from '../../pipes/nl2br.pipe';

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
    Nl2brPipe
  ],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly route = inject(ActivatedRoute);
  private readonly testimonialApi = inject(TestimonialService);
  private readonly whatIDoApi = inject(WhatIDoService);
  private readonly profileApi = inject(ProfileService);

  // ========================================================================
  // View References
  // ========================================================================

  /** Reference to carousel element for horizontal scrolling */
  @ViewChild('carousel') private carouselRef?: ElementRef<HTMLElement>;

  // ========================================================================
  // Properties
  // ========================================================================

  /** Page title from route data */
  title = toSignal(
    this.route.data.pipe(map(data => data['title'] as string)), 
    { initialValue: '' }
  );

  // Profile section
  profile = signal<ProfileData | null>(null);
  profileLoading = signal(true);
  profileError = signal<string | null>(null);

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
    this.loadProfileData();
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

    // Convert vertical scroll to horizontal if gesture is primarily vertical
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault?.();
      element.scrollBy({ left: event.deltaY });
    }
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
        console.log('Profile data loaded:', data);
        if (data && data.bio) {
          this.profile.set(data);
        } else {
          console.warn('Profile data incomplete:', data);
          this.profileError.set('Dati del profilo incompleti');
        }
        this.profileLoading.set(false);
      },
      error: (error) => {
        console.error('Profile loading error:', error);
        this.profileError.set(`Errore nel caricamento del profilo: ${error.message || 'Errore sconosciuto'}`);
        this.profileLoading.set(false);
      }
    });
  }

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
}
