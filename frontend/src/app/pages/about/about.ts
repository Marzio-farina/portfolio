import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { WhatIDoCard } from '../../components/what-i-do-card/what-i-do-card';
import { TestimonialCard } from '../../components/testimonial-card/testimonial-card';
import { Avatar } from '../../components/avatar/avatar';
import { TestimonialService } from '../../services/testimonial.service';
import { Testimonial } from '../../core/models/testimonial';
import { WhatIDoService } from '../../services/what-i-do.service';

type AboutCard = {
  id: string;
  title: string;
  description: string;
  icon?: string;
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
  private testimonialApi = inject(TestimonialService);
  private whatIDoApi = inject(WhatIDoService);

  // ref al carosello: nel template assegna #carousel al contenitore con overflow-x-auto
  @ViewChild('carousel') private carouselRef?: ElementRef<HTMLElement>;

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  // WHAT-I-DO
  cards = signal<AboutCard[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  // TESTIMONIALS
  testimonials = signal<Testimonial[]>([]);
  testimonialsLoading = signal(true);
  testimonialsError = signal<string | null>(null);
  page = signal(1);
  perPage = signal(8);
  lastPage = signal(1);

  constructor() {
    // Carica what-i-do
    this.whatIDoApi.get$().subscribe({
      next: items => {
        // mappo id numerico -> stringa per AboutCard
        this.cards.set(items.map(it => ({
          id: String(it.id),
          title: it.title,
          description: it.description,
          icon: it.icon
        })));
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Impossibile caricare le card.');
        this.loading.set(false);
      }
    });

    // Carica testimonials
    this.fetchTestimonials(this.page(), this.perPage());
  }

  next() { if (this.page() < this.lastPage()) { this.page.set(this.page() + 1); this.fetchTestimonials(this.page(), this.perPage()); } }
  prev() { if (this.page() > 1) { this.page.set(this.page() - 1); this.fetchTestimonials(this.page(), this.perPage()); } }
  
  trackById = (_: number, c: AboutCard) => c.id;

  // Handler: dirotta lo scroll verticale in orizzontale sul carosello
  onWheelToHorizontal(e: WheelEvent): void {
    const el = this.carouselRef?.nativeElement;
    if (!el) return;

    // Se il gesto è principalmente verticale, spostiamo orizzontalmente
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      // Nota: se vuoi bloccare lo scroll verticale della pagina,
      // nel template aggiungi anche 'overflow-y-hidden' al contenitore.
      e.preventDefault?.(); // sarà ignorato se il listener è passivo
      el.scrollBy({ left: e.deltaY });
    }
  }

  private fetchTestimonials(page: number, perPage: number) {
    this.testimonialsLoading.set(true);
    this.testimonialApi.list$(page, perPage).subscribe({
      next: res => {
        this.testimonials.set(res.data ?? []);
        this.lastPage.set(res.meta?.last_page ?? 1);
        this.testimonialsLoading.set(false);
      },
      error: () => {
        this.testimonialsError.set('Impossibile caricare le testimonianze.');
        this.testimonialsLoading.set(false);
      }
    });
  }
}
