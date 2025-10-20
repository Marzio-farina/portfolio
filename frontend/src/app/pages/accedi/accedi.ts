import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-accedi',
  imports: [],
  templateUrl: './accedi.html',
  styleUrl: './accedi.css'
})
export class Accedi {
  private route = inject(ActivatedRoute);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
}