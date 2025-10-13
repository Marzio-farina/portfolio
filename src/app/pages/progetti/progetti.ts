import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ProgettiCard } from '../../components/progetti-card/progetti-card';
import { Filter } from '../../components/filter/filter';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-progetti',
  imports: [
    ProgettiCard,
    Filter
  ],
  templateUrl: './progetti.html',
  styleUrl: './progetti.css'
})
export class Progetti {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  projects = signal<any[]>([]);

  constructor() {
    this.http.get<{ projects: any[] }>('assets/json/progetti.json')
      .subscribe(data => this.projects.set(data.projects));
  }
}
