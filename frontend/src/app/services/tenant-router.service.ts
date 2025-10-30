import { Injectable, inject } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class TenantRouterService {
  private readonly router = inject(Router);
  private readonly tenant = inject(TenantService);

  navigate(commands: any[], extras?: NavigationExtras) {
    const slug = this.tenant.userSlug();
    const parts = Array.isArray(commands) ? commands : [commands];
    const normalized = parts.flat().filter(Boolean).map(String);
    const finalCmds = slug ? ['/', slug, ...normalized] : ['/', ...normalized];
    return this.router.navigate(finalCmds, extras);
  }
}


