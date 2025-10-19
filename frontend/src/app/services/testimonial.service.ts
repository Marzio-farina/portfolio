import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { map, Observable } from "rxjs";
import { Testimonial } from "../core/models/testimonial";
import { apiUrl } from "../core/api/api-url";

export interface Paginated<T> {
  data: T[];
  meta?: { current_page: number; per_page: number; total: number; last_page: number; };
}

@Injectable({ providedIn: 'root' })
export class TestimonialService {
  private http = inject(HttpClient);

  // usa SEMPRE apiUrl('testimonials'), niente stringhe hard-coded tipo '/testimonials'
  list$(page = 1, perPage = 8): Observable<Paginated<Testimonial>> {
    const url = apiUrl('testimonials');
    return this.http.get<Paginated<Testimonial>>(url, { params: { page, per_page: perPage }});
  }
}