import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
  private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
}
