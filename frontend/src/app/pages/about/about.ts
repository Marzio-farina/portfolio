import { Component, ElementRef, inject, signal, ViewChild, OnDestroy } from '@angular/core';
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
export class About implements OnDestroy {
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

  // Bio expansion state
  bioExpanded = signal(false);
  
  // Typewriter effect state
  displayedText = signal('');
  isTyping = signal(false);
  
  // Click outside listener
  private clickOutsideListener?: (event: MouseEvent) => void;
  private typewriterInterval?: number;

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
        this.profile.set(data ?? null);
        this.profileLoading.set(false);
      },
      error: () => {
        this.profileError.set('Impossibile caricare il profilo.');
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

  /**
   * Toggle bio expansion on mobile
   */
  toggleBioExpansion(): void {
    const newExpanded = !this.bioExpanded();
    this.bioExpanded.set(newExpanded);
    
    if (newExpanded) {
      // Aggiungi listener per click fuori dal riquadro
      this.addClickOutsideListener();
      // Avvia effetto typewriter
      this.startTypewriterEffect();
    } else {
      // Rimuovi listener quando si chiude
      this.removeClickOutsideListener();
      // Ferma effetto typewriter
      this.stopTypewriterEffect();
    }
  }

  /**
   * Close bio expansion
   */
  closeBioExpansion(event: Event): void {
    event.stopPropagation(); // Previene il toggle quando si clicca sulla X
    this.bioExpanded.set(false);
    this.removeClickOutsideListener(); // Rimuovi listener quando si chiude
    this.stopTypewriterEffect(); // Ferma effetto typewriter
  }

  /**
   * Add click outside listener to close bio when clicking outside
   */
  private addClickOutsideListener(): void {
    // Usa setTimeout per evitare che il click che apre il riquadro lo chiuda immediatamente
    setTimeout(() => {
      this.clickOutsideListener = (event: MouseEvent) => {
        const bioCard = document.querySelector('.bio-card-mobile.expanded');
        const target = event.target as HTMLElement;
        
        if (bioCard && !bioCard.contains(target)) {
          this.bioExpanded.set(false);
          this.removeClickOutsideListener();
        }
      };
      
      document.addEventListener('click', this.clickOutsideListener);
    }, 100);
  }

  /**
   * Remove click outside listener
   */
  private removeClickOutsideListener(): void {
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener);
      this.clickOutsideListener = undefined;
    }
  }

  /**
   * Start typewriter effect for bio text
   */
  private startTypewriterEffect(): void {
    const bioText = this.profile()?.bio || '';
    if (!bioText) return;
    
    this.isTyping.set(true);
    this.displayedText.set('');
    
    let currentIndex = 0;
    const typingSpeed = 30; // millisecondi tra ogni carattere
    
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
   * Stop typewriter effect
   */
  private stopTypewriterEffect(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = undefined;
    }
    this.isTyping.set(false);
  }

  /**
   * Cleanup when component is destroyed
   */
  ngOnDestroy(): void {
    this.removeClickOutsideListener();
    this.stopTypewriterEffect();
  }
}
