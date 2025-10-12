import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { WhatIDoCard } from '../../components/what-i-do-card/what-i-do-card';
import { TestimonialCard } from '../../components/testimonial-card/testimonial-card';
import { Avatar } from '../../components/avatar/avatar';

type AboutCard = {
  id: string;
  title: string;
  description: string;
  icon?: string;
};

type Testimonial = {
  id: string;
  author: string;
  text: string;
  role?: string;
  company?: string;
  rating?: number;
};

@Component({
  selector: 'app-about',
  imports: [
    WhatIDoCard,
    Avatar,
    TestimonialCard
],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  // WHAT-I-DO
  cards = signal<AboutCard[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  // TESTIMONIALS
  testimonials = signal<Testimonial[]>([]);
  testimonialsLoading = signal(true);
  testimonialsError = signal<string | null>(null);

  constructor() {
    // Carica what-i-do
    this.http.get<AboutCard[]>('assets/json/what-i-do.json').subscribe({
      next: data => {
        this.cards.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Impossibile caricare le card.');
        this.loading.set(false);
      }
    });

    // Carica testimonials
    this.http.get<Testimonial[]>('assets/json/testimonials.json').subscribe({
      next: data => { this.testimonials.set(data ?? []); this.testimonialsLoading.set(false); },
      error: () => { this.testimonialsError.set('Impossibile caricare le testimonianze.'); this.testimonialsLoading.set(false); }
    });
  }

  trackById = (_: number, c: AboutCard) => c.id;
  trackByTestimonialId = (_: number, t: Testimonial) => t.id;
}
