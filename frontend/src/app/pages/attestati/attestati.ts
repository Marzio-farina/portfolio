import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { PingTest } from '../../test/ping-test/ping-test';

@Component({
  selector: 'app-attestati',
  imports: [
    PingTest
  ],
  templateUrl: './attestati.html',
  styleUrl: './attestati.css'
})
export class Attestati {
private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
}