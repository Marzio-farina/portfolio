import { Component, Input, signal } from '@angular/core';
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
  @Input({ required: true }) id!: string;
  @Input({ required: true }) title!: string;
  @Input() icon: 'book' | 'briefcase' | 'star' = 'book';
  @Input() items: Item[] = [];
  @Input() set open(v: boolean) { this.isOpen.set(!!v); }
  isOpen = signal(true);

  toggle() { this.isOpen.update(v => !v); }

  get iconPath(): string {
    switch (this.icon) {
      case 'briefcase': return 'M4 7h16v11H4z M8 7V5h8v2';
      case 'star': return 'M12 3l3 6h6l-5 4 2 6-6-3.5L6 19l2-6-5-4h6z';
      default: return 'M5 4h14v16H5z M8 7h8 M8 10h8 M8 13h8'; // book
    }
  }
}
