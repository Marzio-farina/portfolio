import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { apiUrl } from '../core/api/api-url';

/**
 * Statistiche repository
 */
export interface RepoStats {
  name: string;
  url: string;
  commits: number;
  error?: string;
}

/**
 * Servizio per interagire con l'API di GitHub tramite proxy backend
 */
@Injectable({ providedIn: 'root' })
export class GitHubService {
  private readonly http = inject(HttpClient);

  /**
   * Estrae owner e repository da un URL GitHub
   * Es: https://github.com/Marzio-farina/portfolio -> { owner: 'Marzio-farina', repo: 'portfolio' }
   */
  private parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    try {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) return null;
      return { owner: match[1], repo: match[2] };
    } catch {
      return null;
    }
  }


  /**
   * Ottiene statistiche complete del repository inclusi i commit
   * Usa il proxy backend per evitare problemi di rate limiting
   * @param githubUrl URL completo del repository GitHub
   * @returns Observable con statistiche complete
   */
  getFullRepoStats$(githubUrl: string): Observable<RepoStats | null> {
    const parsed = this.parseGitHubUrl(githubUrl);
    if (!parsed) {
      return of(null);
    }

    const { owner, repo } = parsed;
    
    // Chiama il proxy backend invece dell'API GitHub diretta
    return this.http.get<RepoStats>(apiUrl(`/github/${owner}/${repo}/stats`)).pipe(
      map(stats => stats),
      catchError(err => {
        console.error('Errore nel recupero dati GitHub:', err);
        return of({
          name: repo,
          url: githubUrl,
          commits: 0,
          error: 'Impossibile recuperare i dati da GitHub. Riprova più tardi.'
        });
      })
    );
  }
}

