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
  list$(page = 1, perPage = 8, userId?: number): Observable<Paginated<Testimonial>> {
    const url = apiUrl('testimonials');
    
    // Aggiungi sempre un timestamp per evitare problemi di cache con ETag
    // Questo fa sì che ogni richiesta appaia diversa al browser
    const params: any = { page, per_page: perPage, _t: Date.now() };
    if (userId) params.user_id = String(userId);
    
    return this.http.get<Paginated<Testimonial>>(url, { params });
  }

  create$(data: any): Observable<Testimonial> {
    const url = apiUrl('testimonials');
    
    // Se c'è un file da caricare, usa FormData
    if (data.avatar_file) {
      const formData = new FormData();
      
      // Aggiungi tutti i campi del form
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          // Se è un file, aggiungilo direttamente
          if (data[key] instanceof File) {
            formData.append(key, data[key]);
          } else {
            formData.append(key, String(data[key]));
          }
        }
      });
      
      return this.http.post<Testimonial>(url, formData);
    }
    
    // Altrimenti invia come JSON normale (pulisci i campi null/undefined)
    const cleanedData: any = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        cleanedData[key] = data[key];
      }
    });
    
    return this.http.post<Testimonial>(url, cleanedData);
  }
}