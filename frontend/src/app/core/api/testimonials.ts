import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';
import { BaseApiService } from './base-api.service';

export interface Testimonial {
  id: number;
  // ...altri campi
}
export interface Paginated<T> {
  data: T[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

@Injectable({ providedIn: 'root' })
export class TestimonialsApi extends BaseApiService {
  list(page = 1, perPage = 12): Observable<Paginated<Testimonial>> {
    const params = { page: String(page), per_page: String(perPage) } as const;
    return this.cachedGet<Paginated<Testimonial>>(apiUrl('testimonials'), params as any);
  }
}