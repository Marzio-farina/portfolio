import { Component, input, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Attestato } from '../../models/attestato.model';

@Component({
  selector: 'app-attestati-card',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './attestati-card.html',
  styleUrls: ['./attestati-card.css'],
})
export class AttestatiCard {
  attestato = input.required<Attestato>();

  // segna questa card come LCP/priority dall’esterno (di default false)
  priority = input<boolean>(false);

  // rapporto predefinito nel primo paint, finché non conosciamo le dimensioni reali
  defaultAR = '16 / 9';

  // sarà impostato a "<naturalWidth> / <naturalHeight>" al load
  aspectRatio = signal<string | null>(null);

  onImgLoad(ev: Event) {
    const el = ev.target as HTMLImageElement;
    if (el?.naturalWidth && el?.naturalHeight) {
      this.aspectRatio.set(`${el.naturalWidth} / ${el.naturalHeight}`);
    }
  }

  onImgError(ev: Event) {
    console.warn('img error', ev);
  }
}
