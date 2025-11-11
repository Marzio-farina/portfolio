import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../core/api/api-url';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);

  userId = signal<number | null>(null);
  userSlug = signal<string | null>(null);

  clear(): void {
    this.userId.set(null);
    this.userSlug.set(null);
  }

  resolveSlug$(slug: string) {
    // Chiama direttamente l'API invece di passare per AboutProfileService
    // per evitare circular dependency: TenantService ↔ AboutProfileService
    const normalizedSlug = slug.toLowerCase();
    return this.http.get<{id: number}>(apiUrl(`${normalizedSlug}/public-profile`)).pipe(
      map(p => ({ id: p.id }))
    );
  }

  setTenant(slug: string, id: number): void {
    // Normalizza sempre lo slug in minuscolo per coerenza con il database
    this.userSlug.set(slug.toLowerCase());
    this.userId.set(id);
  }
}


