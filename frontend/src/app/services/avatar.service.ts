import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AvatarData } from '../components/avatar/avatar';
import { DefaultAvatarService } from './default-avatar.service';

/**
 * Avatar Service (DEPRECATO - usa DefaultAvatarService)
 * 
 * Questo servizio è mantenuto per retrocompatibilità.
 * Internamente usa DefaultAvatarService che ha il caching implementato.
 * 
 * @deprecated Usa DefaultAvatarService.getDefaultAvatars() direttamente
 */
@Injectable({
  providedIn: 'root'
})
export class AvatarService {

  constructor(private defaultAvatarService: DefaultAvatarService) {}

  /**
   * Get default avatar images from the backend API
   * 
   * @deprecated Usa DefaultAvatarService.getDefaultAvatars() direttamente
   * @returns Observable array of AvatarData with complete URLs
   */
  getAvatars(): Observable<AvatarData[]> {
    // Delega a DefaultAvatarService che ha il caching
    return this.defaultAvatarService.getDefaultAvatars();
  }
}