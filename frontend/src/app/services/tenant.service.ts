import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../core/api/api-url';
import { AboutProfileService } from './about-profile.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);
  private readonly about = inject(AboutProfileService);

  userId = signal<number | null>(null);
  userSlug = signal<string | null>(null);

  clear(): void {
    this.userId.set(null);
    this.userSlug.set(null);
  }

  resolveSlug$(slug: string) {
    // Usa il servizio con cache per evitare una seconda GET identica
    return this.about.getBySlug(slug).pipe(map(p => ({ id: p.id })));
  }

  setTenant(slug: string, id: number): void {
    // Normalizza sempre lo slug in minuscolo per coerenza con il database
    this.userSlug.set(slug.toLowerCase());
    this.userId.set(id);
  }
}


