import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-contatti',
  imports: [],
  templateUrl: './contatti.html',
  styleUrl: './contatti.css'
})
export class Contatti {
private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
}