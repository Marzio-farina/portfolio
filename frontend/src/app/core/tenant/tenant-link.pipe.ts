import { Pipe, PipeTransform, inject } from '@angular/core';
import { TenantService } from '../../services/tenant.service';

@Pipe({
  name: 'tenantLink',
  standalone: true,
  // Impure per ricalcolare quando cambia lo slug (signal nel TenantService)
  pure: false
})
export class TenantLinkPipe implements PipeTransform {
  private readonly tenant = inject(TenantService);

  transform(segments: string | any[]): any[] {
    const slug = this.tenant.userSlug();
    const parts = Array.isArray(segments) ? segments : [segments];
    const normalized = parts.filter(Boolean).map(String);
    return slug ? ['/', slug, ...normalized] : ['/', ...normalized];
  }
}


