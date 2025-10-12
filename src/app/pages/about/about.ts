import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Card } from '../../components/card/card';
import { HttpClient } from '@angular/common/http';

type AboutCard = {
  id: string;
  title: string;
  description: string;
  icon?: string;
};

@Component({
  selector: 'app-about',
  imports: [Card],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  cards = signal<AboutCard[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  constructor() {
    this.http.get<AboutCard[]>('assets/json/cards.json').subscribe({
      next: data => {
        this.cards.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Impossibile caricare le card.');
        this.loading.set(false);
      }
    });
  }

  trackById = (_: number, c: AboutCard) => c.id;
}
