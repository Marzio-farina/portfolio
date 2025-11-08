import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TenantLinkPipe } from '../../core/tenant/tenant-link.pipe';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, TenantLinkPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush // ⚡ Performance boost
})
export class Navbar {

}
