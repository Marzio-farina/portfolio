import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';

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
export class TestimonialsApi {
  private readonly http = inject(HttpClient);

  list(page = 1, perPage = 12): Observable<Paginated<Testimonial>> {
    const params = { page, per_page: perPage } as const;
    return this.http.get<Paginated<Testimonial>>(apiUrl('/testimonials'), { params });
  }
}