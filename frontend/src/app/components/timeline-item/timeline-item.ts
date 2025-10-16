import { Component, input } from '@angular/core';

@Component({
  selector: 'app-timeline-item',
  imports: [],
  templateUrl: './timeline-item.html',
  styleUrl: './timeline-item.css'
}) 
export class TimelineItem {
  title = input.required<string>();
  years = input.required<string>();
  description = input<string>('');
}