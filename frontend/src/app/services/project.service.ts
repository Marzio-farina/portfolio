import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../core/api/api-url';
import { Paginated, ProjectDto } from '../core/models/project';
import { Progetto } from '../components/progetti-card/progetti-card';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);

  /** Chiamata paginata */
  list$(page = 1, perPage = 12): Observable<Paginated<Progetto>> {
    const url = apiUrl('projects');
    return this.http.get<Paginated<ProjectDto>>(url, { params: { page, per_page: perPage } })
      .pipe(
        map(res => ({
          ...res,
          data: (res.data ?? []).map(dtoToProgetto)
        }))
      );
  }

  /** Se vuoi caricare “tutti” in una volta sola (occhio ai volumi) */
  listAll$(max = 1000): Observable<Progetto[]> {
    return this.list$(1, max).pipe(map(r => r.data ?? []));
  }
}

/** Mapper DTO → UI */
function dtoToProgetto(p: ProjectDto): Progetto {
  const catName = (p.category?.name
    ?? (p as any).category?.title   // fallback se lato API usi "title"
    ?? 'Senza categoria').toString();

  const techs = (p.technologies ?? [])
    .map(t => (t.name ?? '').toString())
    .filter(Boolean)
    .join(', ');

  return {
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    poster: p.poster ?? '',
    video: p.video ?? '',
    category: catName,
    technologies: techs
  };
}