import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import { Ping, PingResponse } from '../../core/api/ping';

@Component({
  selector: 'app-ping-test',
  imports: [NgIf, JsonPipe, AsyncPipe],
  templateUrl: './ping-test.html',
  styleUrl: './ping-test.css'
})
export class PingTest {
  private readonly api = inject(Ping);
  data = signal<PingResponse | null>(null);
  error = signal<string | null>(null);
  loading = signal(false);

  ping() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getPing().subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: (err) => { this.error.set(err?.message ?? 'Errore'); this.loading.set(false); }
    });
  }
}