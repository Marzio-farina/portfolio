import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { apiUrl } from '../core/api/api-url';
import { Paginated, ProjectDto } from '../core/models/project';
import { Progetto } from '../components/progetti-card/progetti-card';

/**
 * Project Service
 * 
 * Manages project data operations including fetching paginated
 * project lists and converting API DTOs to UI models.
 */
@Injectable({ providedIn: 'root' })
export class ProjectService {
  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly http = inject(HttpClient);

  // ========================================================================
  // Public Methods
  // ========================================================================

  /**
   * Get paginated list of projects
   * 
   * @param page Page number (default: 1)
   * @param perPage Items per page (default: 12)
   * @param forceRefresh Se true, disabilita la cache
   * @returns Observable of paginated project data
   */
  list$(page = 1, perPage = 12, userId?: number, forceRefresh = false): Observable<Paginated<Progetto>> {
    const url = apiUrl('projects');
    const params: any = { page, per_page: perPage };
    if (userId) params.user_id = String(userId);
    
    // Aggiungi timestamp per bypassare la cache quando si forza il refresh
    if (forceRefresh) {
      params['_t'] = Date.now();
    }
    
    // Headers per disabilitare cache quando si forza il refresh
    const headers = forceRefresh ? new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }) : undefined;
    
    return this.http.get<Paginated<ProjectDto>>(url, { 
      params,
      headers
    }).pipe(
      map(response => ({
        ...response,
        data: (response.data ?? []).map(dto => this.dtoToProgetto(dto))
      }))
    );
  }

  /**
   * Get all projects (up to specified maximum)
   * 
   * @param max Maximum number of projects to fetch (default: 1000)
   * @param forceRefresh Se true, disabilita la cache
   * @returns Observable of project array
   */
  listAll$(max = 1000, userId?: number, forceRefresh = false): Observable<Progetto[]> {
    return this.list$(1, max, userId, forceRefresh).pipe(
      map(response => response.data ?? [])
    );
  }

  /**
   * Crea un nuovo progetto
   * 
   * @param data FormData con i dati del progetto
   * @returns Observable del progetto creato
   */
  create$(data: FormData): Observable<any> {
    const url = apiUrl('projects');
    return this.http.post<any>(url, data);
  }

  /**
   * Soft-delete di un progetto
   * 
   * @param id ID del progetto da eliminare
   * @returns Observable che completa quando l'eliminazione è terminata
   */
  delete$(id: number): Observable<void> {
    const url = apiUrl(`projects/${id}`);
    return this.http.delete<void>(url);
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Convert API DTO to UI model
   * 
   * @param dto Project DTO from API
   * @returns UI model for project display
   */
  private dtoToProgetto(dto: ProjectDto): Progetto {
    const categoryName = this.extractCategoryName(dto);
    const technologiesString = this.extractTechnologiesString(dto);

    return {
      id: dto.id,
      title: dto.title,
      description: dto.description ?? '',
      poster: dto.poster ?? '',
      video: dto.video ?? '',
      category: categoryName,
      technologies: technologiesString
    };
  }

  /**
   * Extract category name from project DTO
   * 
   * @param dto Project DTO
   * @returns Category name or default value
   */
  private extractCategoryName(dto: ProjectDto): string {
    return dto.category?.name 
      ?? (dto as any).category?.title 
      ?? 'Senza categoria';
  }

  /**
   * Extract technologies as comma-separated string
   * 
   * @param dto Project DTO
   * @returns Technologies string
   */
  private extractTechnologiesString(dto: ProjectDto): string {
    return (dto.technologies ?? [])
      .map(tech => (tech as any).title ?? tech.name ?? '')
      .filter(Boolean)
      .join(', ');
  }
}