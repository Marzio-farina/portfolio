import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-maps',
  imports: [CommonModule],
  templateUrl: './maps.html',
  styleUrl: './maps.css'
})
export class Maps {
  // Stato di caricamento della mappa
  loaded = signal(false);

  onMapLoad() {
    this.loaded.set(true);
  }
}
