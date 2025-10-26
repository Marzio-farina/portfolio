import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AvatarData } from '../components/avatar/avatar';
import { apiUrl } from '../core/api/api-url';

@Injectable({
  providedIn: 'root'
})
export class AvatarService {

  constructor(private http: HttpClient) {}

  /**
   * Get default avatar images from the backend API
   * 
   * The backend returns full absolute URLs, so no need for URL construction
   * in the frontend - just use the img field directly
   * 
   * @returns Observable array of AvatarData with complete URLs
   */
  getAvatars(): Observable<AvatarData[]> {
    return this.http.get<{ avatars: AvatarData[] }>(apiUrl('testimonials/default-avatars')).pipe(
      map(response => response.avatars)
    );
  }
}