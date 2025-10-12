import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-timeline-item',
  imports: [],
  templateUrl: './timeline-item.html',
  styleUrl: './timeline-item.css'
})
export class TimelineItem {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) years!: string;
  @Input() description = '';
}
