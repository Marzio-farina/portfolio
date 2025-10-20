import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';

export type Attestato = {
  id: number;
  title: string;
  ente: string;
  data?: string | Date;   // data conseguimento
  cover: string;          // immagine copertina (png/jpg/webp)
  pdf?: string;           // link al certificato
  badgeUrl?: string;      // eventuale link al badge (Credly ecc.)
  skills?: string[];      // tag competenze opzionali
};

@Component({
  selector: 'app-attestati-card',
  imports: [DatePipe],
  templateUrl: './attestati-card.html',
  styleUrl: './attestati-card.css'
})
export class AttestatiCard {
  attestato = input.required<Attestato>();
}