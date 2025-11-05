import { Component, input } from '@angular/core';

/**
 * Overlay di conferma cancellazione con skeleton loader
 * 
 * L'overlay si posiziona sul contenuto della card creando un effetto
 * di blur e oscuramento durante la conferma di cancellazione.
 */
@Component({
  selector: 'app-deletion-overlay',
  standalone: true,
  templateUrl: './deletion-overlay.html',
  styleUrl: './deletion-overlay.css'
})
export class DeletionOverlay {
  /**
   * Quantità di blur in pixel (default: 8)
   */
  blurAmount = input<number>(8);
}

