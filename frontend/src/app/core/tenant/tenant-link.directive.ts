import { Directive, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TenantService } from '../../services/tenant.service';

@Directive({
  selector: '[tenantLink]'
})
export class TenantLinkDirective implements OnChanges {
  private readonly routerLink = inject(RouterLink);
  private readonly tenant = inject(TenantService);

  @Input('tenantLink') segments: string | any[] = [];

  ngOnChanges(_: SimpleChanges): void {
    const slug = this.tenant.userSlug();
    const parts = Array.isArray(this.segments) ? this.segments : [this.segments];
    const normalized = parts.filter(Boolean).map(String);
    const finalLink = slug ? ['/', slug, ...normalized] : ['/', ...normalized];
    this.routerLink.routerLink = finalLink as any;
  }
}


