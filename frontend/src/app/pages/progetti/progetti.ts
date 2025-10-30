import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ProgettiCard, Progetto } from '../../components/progetti-card/progetti-card';
import { Filter } from '../../components/filter/filter';
import { ProjectService } from '../../services/project.service';
import { TenantService } from '../../services/tenant.service';

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
  private api   = inject(ProjectService);
  private tenant = inject(TenantService);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  projects = signal<Progetto[]>([]);
  // categoria selezionata
  selectedCategory = signal<string>('Tutti');

  // stati UI
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  
  // categorie uniche calcolate dai progetti
  categories = computed<string[]>(() => {
    const set = new Set(this.projects().map(p => p.category).filter(Boolean));
    return ['Tutti', ...Array.from(set).sort()];
  });

  // lista filtrata in base alla categoria scelta
  filtered = computed<Progetto[]>(() => {
    const cat = this.selectedCategory();
    const all = this.projects();
    return (cat === 'Tutti') ? all : all.filter(p => p.category === cat);
  });

  constructor() {
    // Carichiamo (qui: tutti fino a 1000; se vuoi, usa paginazione list$ page/perPage)
    const uid = this.tenant.userId();
    this.api.listAll$(1000, uid ?? undefined).subscribe({
      next: data => { this.projects.set(data); this.loading.set(false); },
      error: err => { this.errorMsg.set('Impossibile caricare i progetti.'); this.loading.set(false); }
    });
  }
  
  onSelectCategory(c: string) {
    this.selectedCategory.set(c);
  }
}
