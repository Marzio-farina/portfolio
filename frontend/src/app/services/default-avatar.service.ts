import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AvatarData } from '../components/avatar/avatar';
import { apiUrl } from '../core/api/api-url';
import { BaseApiService } from '../core/api/base-api.service';

/**
 * Default Avatar Service
 * 
 * Servizio per caricare gli avatar predefiniti dal backend.
 * Usa caching con shareReplay per evitare chiamate HTTP duplicate.
 * 
 * IMPORTANTE: Usato da add-testimonial e avatar-editor.
 * Senza caching, ogni componente farebbe una chiamata HTTP separata!
 */
@Injectable({
  providedIn: 'root'
})
export class DefaultAvatarService extends BaseApiService {

  // Cache per gli avatar (condivisa tra tutte le istanze)
  private avatarsCache$?: Observable<AvatarData[]>;

  /**
   * Ottieni gli avatar predefiniti con caching.
   * La prima chiamata fa HTTP GET, le successive usano la cache.
   */
  getDefaultAvatars(): Observable<AvatarData[]> {
    // Se già in cache, ritorna l'observable cachato
    if (this.avatarsCache$) {
      return this.avatarsCache$;
    }

    // Prima chiamata: crea observable con shareReplay
    this.avatarsCache$ = this.http.get<{avatars: AvatarData[]}>(
      apiUrl('testimonials/default-avatars')
    ).pipe(
      map(response => response.avatars || []),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.avatarsCache$;
  }

  /**
   * Invalida la cache (utile dopo upload di nuovi avatar)
   */
  invalidateCache(): void {
    this.avatarsCache$ = undefined;
  }
}
