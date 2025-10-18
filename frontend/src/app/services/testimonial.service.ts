import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { map, Observable } from "rxjs";
import { Paginated, Testimonial } from "../core/models/testimonial";

@Injectable({ providedIn: 'root' })
export class TestimonialService {
  private http = inject(HttpClient);
  private base = environment.API_BASE_URL;

  // Se vuoi i meta di paginazione:
  list$(page = 1, perPage = 12): Observable<Paginated<Testimonial>> {
    const url = `${this.base}/testimonials?page=${page}&per_page=${perPage}`;
    return this.http.get<Paginated<Testimonial>>(url);
  }

  // Se al component servono solo i dati:
  listData$(page = 1, perPage = 12): Observable<Testimonial[]> {
    return this.list$(page, perPage).pipe(map(res => res.data));
  }
}