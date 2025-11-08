import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-job-offers',
  standalone: true,
  imports: [],
  templateUrl: './job-offers.html',
  styleUrl: './job-offers.css'
})
export class JobOffers {
  private route = inject(ActivatedRoute);
  
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
}

