import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TenantLinkPipe } from '../../core/tenant/tenant-link.pipe';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, TenantLinkPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

}
