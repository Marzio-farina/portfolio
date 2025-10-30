import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { WhatIDoCard } from '../../components/what-i-do-card/what-i-do-card';
import { Bio } from '../../components/bio/bio';
import { WhatIDoService } from '../../services/what-i-do.service';
import { TenantService } from '../../services/tenant.service';
import { ProfileService, ProfileData } from '../../services/profile.service';
import { TestimonialCarouselCard } from '../../components/testimonial-carousel-card/testimonial-carousel-card';
import { Notification, NotificationItem } from '../../components/notification/notification';

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
    Bio,
    TestimonialCarouselCard,
    Notification
  ],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly route = inject(ActivatedRoute);
  private readonly whatIDoApi = inject(WhatIDoService);
  private readonly tenant = inject(TenantService);
  private readonly profileApi = inject(ProfileService);


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
  toastMessage = signal<string | null>(null);
  toastNotifications = signal<NotificationItem[]>([]);

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.loadWhatIDoData();
    // Ricarica quando cambia tenant
    const t = this.tenant; // cattura ref
    // usa micro-task per non interrompere il costruttore
    queueMicrotask(() => {
      const effectRef = (window as any).ngEffect?.(() => {
        void t.userId();
        this.loadWhatIDoData();
      });
    });
    const state = window.history.state as any;
    if (state && state.toast && state.toast.message) {
      // nota: alimenta sia il messaggio singolo che la pila multiple
      const msg = String(state.toast.message);
      this.toastMessage.set(msg);
      const item: NotificationItem = {
        id: `nav-${Date.now()}`,
        message: msg,
        type: state.toast.type ?? 'success',
        timestamp: Date.now(),
        fieldId: 'success'
      };
      this.toastNotifications.set([item]);
      history.replaceState({}, document.title);
    }
  }

  // ========================================================================
  // Public Methods
  // ========================================================================


  /**
   * Track function for ngFor optimization
   * 
   * @param index Item index
   * @param card About card item
   * @returns Unique identifier
   */
  trackById = (_: number, card: AboutCard) => card.id;


  // ========================================================================
  // Private Methods
  // ========================================================================


  /**
   * Load "What I Do" data from API
   */
  private loadWhatIDoData(): void {
    const uid = this.tenant.userId();
    this.whatIDoApi.get$(uid ?? undefined).subscribe({
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


}
