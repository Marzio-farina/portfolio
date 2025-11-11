import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AboutProfileService } from './about-profile.service';
import { ProfileStoreService } from './profile-store.service';

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
  private about = inject(AboutProfileService);
  private store = inject(ProfileStoreService);

  /**
   * Get public profile data
   * 
   * @returns Observable with profile data
   */
  getProfile$(userId?: number): Observable<ProfileData> {
    if (userId !== undefined) {
      return this.about.get$(userId) as unknown as Observable<ProfileData>;
    }
    return toObservable(this.store.profile) as unknown as Observable<ProfileData>;
  }
}

/**
 * Profile data interface
 */
export interface ProfileData {
  id: number;
  name: string;
  surname: string | null;
  email: string;
  slug?: string | null;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  location_url?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  date_of_birth_it?: string | null;
  age?: number | null;
  socials?: SocialLink[];
}

/**
 * Social link interface
 */
export interface SocialLink {
  provider: string;
  handle: string | null;
  url: string | null;
}
