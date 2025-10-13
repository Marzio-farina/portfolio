import { Component, input } from '@angular/core';

@Component({
  selector: 'app-progetti-card',
  imports: [],
  templateUrl: './progetti-card.html',
  styleUrl: './progetti-card.css'
})
export class ProgettiCard {
  progetto = input.required<{ title: string; category: string; video: string }>();
}