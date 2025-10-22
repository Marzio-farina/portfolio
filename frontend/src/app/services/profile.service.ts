import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../core/api/api-url';

/**
 * Profile Service
 * 
 * Manages user profile data including bio, title, and personal information.
 * Provides methods to fetch public profile data from the API.
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);

  /**
   * Get public profile data
   * 
   * @returns Observable with profile data
   */
  getProfile$(): Observable<ProfileData> {
    return this.http.get<ProfileData>(apiUrl('public-profile'), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
  }
}

/**
 * Profile data interface
 */
export interface ProfileData {
  id: number;
  name: string;
  surname: string;
  email: string;
  title?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  date_of_birth?: string;
  date_of_birth_it?: string;
  age?: number;
  socials?: SocialLink[];
}

/**
 * Social link interface
 */
export interface SocialLink {
  provider: string;
  handle: string;
  url: string;
}
