import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../core/api/api-url';

/**
 * DTO per salvare/aggiornare repository GitHub
 */
export interface GitHubRepositoryDto {
  owner: string;  // es: Marzio-farina
  repo: string;   // es: portfolio
  url: string;    // es: https://github.com/Marzio-farina/portfolio
}

/**
 * Risposta dal backend
 */
export interface GitHubRepositoryResponse {
  id: number;
  owner: string;
  repo: string;
  url: string;
  order: number;
}

/**
 * Servizio per gestire le repository GitHub dell'utente
 * Supporta multiple repository per utente
 */
@Injectable({ providedIn: 'root' })
export class GitHubRepositoryService {
  private readonly http = inject(HttpClient);

  /**
   * Ottiene tutte le repository GitHub dell'utente
   * @returns Observable con array di repository
   */
  getAll$(): Observable<GitHubRepositoryResponse[]> {
    return this.http.get<GitHubRepositoryResponse[]>(
      apiUrl('/github-repositories')
    );
  }

  /**
   * Crea una nuova repository GitHub
   * @param data Dati della repository
   * @returns Observable con la risposta
   */
  create$(data: GitHubRepositoryDto): Observable<GitHubRepositoryResponse> {
    return this.http.post<GitHubRepositoryResponse>(
      apiUrl('/github-repositories'),
      data
    );
  }

  /**
   * Elimina una repository GitHub specifica
   * @param id ID della repository da eliminare
   * @returns Observable con la conferma
   */
  delete$(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      apiUrl(`/github-repositories/${id}`)
    );
  }

  /**
   * Aggiorna l'ordine delle repository
   * @param order Array con ID e nuovo ordine
   * @returns Observable con la conferma
   */
  updateOrder$(order: Array<{ id: number; order: number }>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      apiUrl('/github-repositories/reorder'),
      { order }
    );
  }
}

