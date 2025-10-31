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
    
    // Verifica se il timestamp di sessione è stato invalidato (rimosso dopo una modifica)
    const existingSessionTimestamp = sessionStorage.getItem('projects_session_timestamp');
    const hasInvalidatedSession = !existingSessionTimestamp;
    
    // Se forceRefresh è true O se la sessione è stata invalidata, usa timestamp unico
    // Questo garantisce che dopo una modifica, TUTTE le chiamate successive usino dati freschi
    if (forceRefresh || hasInvalidatedSession) {
      // Timestamp unico per ogni chiamata - bypassa completamente la cache
      params['_t'] = Date.now();
      params['_nocache'] = '1';
      // NON ricreare il timestamp di sessione finché non viene esplicitamente resettato
    } else {
      // Timestamp di sessione (cambia solo quando si ricarica la pagina)
      // Questo permette la cache durante la stessa sessione (quando non ci sono modifiche)
      const sessionTimestamp = existingSessionTimestamp || Date.now().toString();
      sessionStorage.setItem('projects_session_timestamp', sessionTimestamp);
      params['_s'] = sessionTimestamp;
    }
    
    // Headers per disabilitare completamente la cache quando si forza il refresh o sessione invalidata
    const shouldBypassCache = forceRefresh || hasInvalidatedSession;
    const headers = shouldBypassCache ? new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'If-Modified-Since': '0',
      'If-None-Match': '*'
    }) : undefined;
    
    return this.http.get<Paginated<ProjectDto>>(url, { 
      params,
      headers,
      // Forza il bypass della cache del browser quando necessario
      observe: 'body' as const
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
    
    // Log FormData (non possiamo ispezionare direttamente, ma loggiamo ciò che possiamo)
    console.log('=== ProjectService.create$ ===', {
      url,
      formData_keys: Array.from(data.keys()),
      has_title: data.has('title'),
      has_category_id: data.has('category_id'),
      has_description: data.has('description'),
      has_poster_file: data.has('poster_file'),
      has_video_file: data.has('video_file'),
      // Prova a leggere i valori testuali (non i file)
      title: data.get('title'),
      category_id: data.get('category_id'),
      description: data.get('description'),
      description_type: typeof data.get('description'),
    });
    
    return this.http.post<any>(url, data);
  }

  /**
   * Aggiorna un progetto esistente con upload di file
   * 
   * @param id ID del progetto da aggiornare
   * @param formData FormData contenente dati e file
   * @returns Observable del progetto aggiornato
   */
  updateWithFiles$(id: number, formData: FormData): Observable<Progetto> {
    const url = apiUrl(`projects/${id}`);
    return this.http.put<{ ok: boolean; data: any }>(url, formData).pipe(
      map(response => {
        // Converti il DTO ricevuto in Progetto
        const dto = response.data;
        return this.dtoToProgetto(dto);
      })
    );
  }

  /**
   * Aggiorna un progetto esistente
   * 
   * @param id ID del progetto da aggiornare
   * @param data Dati parziali da aggiornare
   * @returns Observable del progetto aggiornato
   */
  update$(id: number, data: Partial<{
    title: string;
    category_id: number;
    description: string;
    technology_ids: number[];
  }>): Observable<Progetto> {
    const url = apiUrl(`projects/${id}`);
    return this.http.put<{ ok: boolean; data: any }>(url, data).pipe(
      map(response => {
        // Converti il DTO ricevuto in Progetto
        const dto = response.data;
        return this.dtoToProgetto(dto);
      })
    );
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
    const technologies = this.extractTechnologies(dto);
    const technologiesString = technologies.map(t => t.title).join(', ');

    return {
      id: dto.id,
      title: dto.title,
      description: dto.description ?? '',
      poster: dto.poster ?? '',
      video: dto.video ?? '',
      category: categoryName,
      technologies: technologies,
      technologiesString: technologiesString // Manteniamo anche la stringa per retrocompatibilità
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
   * Extract technologies as array of Technology objects
   * 
   * @param dto Project DTO
   * @returns Technologies array
   */
  private extractTechnologies(dto: ProjectDto): Array<{ id: number; title: string; description?: string | null }> {
    return (dto.technologies ?? [])
      .map(tech => ({
        id: tech.id,
        title: (tech as any).title ?? tech.name ?? '',
        description: tech.description ?? null
      }))
      .filter(tech => tech.title); // Filtra solo tecnologie con titolo valido
  }
}