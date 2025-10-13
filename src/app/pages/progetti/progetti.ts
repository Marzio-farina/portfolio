import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ProgettiCard, Progetto } from '../../components/progetti-card/progetti-card';
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
  // tutti i progetti dal JSON
  projects = signal<Progetto[]>([]);
  // categoria selezionata
  selectedCategory = signal<string>('Tutti');

  // categorie uniche calcolate dai progetti
  categories = computed<string[]>(() => {
    const set = new Set(this.projects().map(p => p.category));
    return ['Tutti', ...Array.from(set)];
  });

  // lista filtrata in base alla categoria scelta
  filtered = computed<Progetto[]>(() => {
    const cat = this.selectedCategory();
    const all = this.projects();
    return (cat === 'Tutti') ? all : all.filter(p => p.category === cat);
  });

  constructor() {
    this.http.get<{ projects: Progetto[] }>('assets/json/progetti.json')
      .subscribe({
        next: d => this.projects.set(d.projects ?? []),
        error: e => console.error('Errore caricamento progetti.json', e)
      });
  }
  
  onSelectCategory(c: string) {
    this.selectedCategory.set(c);
  }
}
