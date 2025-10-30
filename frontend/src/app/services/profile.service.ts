import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../core/api/api-url';
import { AboutProfileService } from './about-profile.service';

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
  private about = inject(AboutProfileService);

  /**
   * Get public profile data
   * 
   * @returns Observable with profile data
   */
  getProfile$(userId?: number): Observable<ProfileData> {
    // Delego al servizio con cache (shareReplay) per evitare chiamate duplicate
    return this.about.get$(userId) as unknown as Observable<ProfileData>;
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
