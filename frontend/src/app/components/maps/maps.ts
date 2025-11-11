import { Component, effect, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { ProfileStoreService } from '../../services/profile-store.service';

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

  private readonly sanitizer = inject(DomSanitizer);
  private readonly auth = inject(AuthService);
  private readonly edit = inject(EditModeService);
  private readonly profileStore = inject(ProfileStoreService);

  // Placeholder visibile solo se: loggato + in modalità modifica + senza location
  showPlaceholder = computed<boolean>(() => !this.hasLocation() && !!this.auth.token() && this.edit.isEditing());
  // Skeleton per visitatori/non edit mode quando manca la location
  showSkeleton = computed<boolean>(() => !this.hasLocation() && !this.showPlaceholder());

  onMapLoad() {
    this.loaded.set(true);
  }

  constructor() {
    // Carica la location_url dal profilo pubblico (tenant-aware)
    effect(() => {
      const profile = this.profileStore.profile();
      const url = (profile?.location_url ?? '').trim();
      if (url) {
        this.src.set(url);
        this.hasLocation.set(true);
      } else {
        this.src.set('');
        this.hasLocation.set(false);
      }
      if (profile?.location) this.locationName.set(profile.location);
    });
  }
}
