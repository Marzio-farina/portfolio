import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
   * @returns Observable of paginated project data
   */
  list$(page = 1, perPage = 12): Observable<Paginated<Progetto>> {
    const url = apiUrl('projects');
    
    return this.http.get<Paginated<ProjectDto>>(url, { 
      params: { page, per_page: perPage } 
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
   * @returns Observable of project array
   */
  listAll$(max = 1000): Observable<Progetto[]> {
    return this.list$(1, max).pipe(
      map(response => response.data ?? [])
    );
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