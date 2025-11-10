import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Interfaccia per i parametri di ricerca
 */
export interface JobSearchParams {
  keyword: string;
  location?: string;
  limit?: number;
  company?: string;
  employment_type?: string;
  remote?: string;
  min_salary?: number | null;
  max_salary?: number | null;
}

/**
 * Interfaccia per le offerte di lavoro scrapate
 */
export interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  posted_date: string;
  url: string;
  salary?: string;
  employment_type?: string;
  remote?: string;
}

/**
 * Interfaccia per la risposta dello scraper
 */
export interface JobScraperResponse {
  success: boolean;
  source: 'adzuna';
  jobs: ScrapedJob[];
  count: number;
  message?: string;
  error?: string;
}

/**
 * Service per lo scraping delle offerte di lavoro
 */
@Injectable({
  providedIn: 'root'
})
export class JobScraperService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_BASE_URL;

  /**
   * Scrape job offers from Adzuna (aggregates Indeed, LinkedIn, Monster, etc.)
   */
  scrapeAdzuna(params: JobSearchParams): Observable<JobScraperResponse> {
    return this.http.post<JobScraperResponse>(
      `${this.apiUrl}/api/job-scraper/adzuna`,
      params
    );
  }
}

