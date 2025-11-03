import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutProfileService } from '../../services/about-profile.service';
import { TenantService } from '../../services/tenant.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';

@Component({
  selector: 'app-maps',
  imports: [CommonModule],
  templateUrl: './maps.html',
  styleUrl: './maps.css'
})
export class Maps {
  // Stato di caricamento della mappa
  loaded = signal(false);
  hasLocation = signal(false);
  src = signal<string>('');
  safeSrc = computed<SafeResourceUrl>(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.src()));
  locationName = signal<string>('San Valentino Torio');

  private readonly about = inject(AboutProfileService);
  private readonly tenant = inject(TenantService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly auth = inject(AuthService);
  private readonly edit = inject(EditModeService);

  // Placeholder visibile solo se: loggato + in modalità modifica + senza location
  showPlaceholder = computed<boolean>(() => !this.hasLocation() && !!this.auth.token() && this.edit.isEditing());
  // Skeleton per visitatori/non edit mode quando manca la location
  showSkeleton = computed<boolean>(() => !this.hasLocation() && !this.showPlaceholder());

  onMapLoad() {
    this.loaded.set(true);
  }

  constructor() {
    // Carica la location_url dal profilo pubblico (tenant-aware)
    this.about.get$().subscribe({
      next: (p) => {
        const url = (p?.location_url ?? '').trim();
        if (url) {
          this.src.set(url);
          this.hasLocation.set(true);
        } else {
          this.src.set('');
          this.hasLocation.set(false);
        }
        if (p?.location) this.locationName.set(p.location);
      }
    });
  }
}
