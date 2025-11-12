import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JobOffer {
  id: number;
  user_id: number;
  company_name: string;
  recruiter_company: string | null;
  position: string;
  work_mode: string | null;
  location: string | null;
  announcement_date: string | null;
  application_date: string | null;
  website: string | null;
  is_registered: boolean;
  status: 'pending' | 'interview' | 'accepted' | 'rejected' | 'archived' | 'search';
  salary_range: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class JobOfferService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_BASE_URL;

  /**
   * Ottiene le statistiche per i tipi di card visibili
   */
  getStats(visibleTypes: string[]): Observable<{
    total: number;
    pending: number;
    interview: number;
    accepted: number;
    rejected: number;
    archived: number;
    emailTotal: number;
    emailSent: number;
    emailReceived: number;
    emailBcc: number;
  }> {
    return this.http.post<{
      total: number;
      pending: number;
      interview: number;
      accepted: number;
      rejected: number;
      archived: number;
      emailTotal: number;
      emailSent: number;
      emailReceived: number;
      emailBcc: number;
    }>(`${this.apiUrl}/api/job-offers/stats`, { visible_types: visibleTypes });
  }

  /**
   * Ottiene tutte le job offers dell'utente autenticato
   */
  getJobOffers(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.apiUrl}/api/job-offers`);
  }

  /**
   * Ottiene una job offer specifica
   */
  getJobOffer(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.apiUrl}/api/job-offers/${id}`);
  }

  /**
   * Crea una nuova job offer
   */
  createJobOffer(data: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.post<JobOffer>(`${this.apiUrl}/api/job-offers`, data);
  }

  /**
   * Aggiorna una job offer
   */
  updateJobOffer(id: number, data: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.put<JobOffer>(`${this.apiUrl}/api/job-offers/${id}`, data);
  }

  /**
   * Elimina una job offer
   */
  deleteJobOffer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/job-offers/${id}`);
  }

  /**
   * Salva le offerte scrapate con status 'search'
   */
  saveScrapedJobs(jobs: Array<{
    company: string;
    title: string;
    location?: string;
    url?: string;
    salary?: string;
    employment_type?: string;
    remote?: string;
  }>): Observable<{
    success: boolean;
    saved_count: number;
    jobs: JobOffer[];
  }> {
    return this.http.post<{
      success: boolean;
      saved_count: number;
      jobs: JobOffer[];
    }>(`${this.apiUrl}/api/job-offers/save-scraped`, { jobs });
  }

  /**
   * Recupera la cronologia delle offerte scrapate (status = 'search')
   */
  getSearchHistory(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.apiUrl}/api/job-offers/search-history`);
  }
}

