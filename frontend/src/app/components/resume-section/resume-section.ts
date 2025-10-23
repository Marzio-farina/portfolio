import { Component, input, signal } from '@angular/core';
import { TimelineItem } from '../timeline-item/timeline-item';

type Item = { title: string; years: string; description: string };

@Component({
  selector: 'app-resume-section',
  imports: [
    TimelineItem
  ],
  templateUrl: './resume-section.html',
  styleUrl: './resume-section.css'
})
export class ResumeSection {
  id = input.required<string>();
  title = input.required<string>();
  icon = input<'book' | 'briefcase' | 'star'>('book');
  items = input<Item[]>([]);
  open = input<boolean, boolean | undefined>(true, { transform: v => !!v });

  isOpen = signal(this.open());

  toggle() {
    this.isOpen.update(v => !v);
  }

  get iconPath(): string {
    switch (this.icon()) {
      case 'briefcase':
        // Icona portfolio/cubo per esperienze lavorative
        return 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12';
      case 'star':
        return 'M12 3l3 6h6l-5 4 2 6-6-3.5L6 19l2-6-5-4h6z';
      default:
        // Icona diploma/graduation cap per studi
        return 'M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5';
    }
  }
}
