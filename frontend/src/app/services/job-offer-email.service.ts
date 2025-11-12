import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type EmailDirection = 'sent' | 'received';

export interface JobOfferEmail {
  id: number;
  subject: string;
  preview: string | null;
  direction: EmailDirection;
  from_address: string | null;
  to_recipients: string[];
  cc_recipients: string[];
  bcc_recipients: string[];
  status: string;
  sent_at: string | null;
  message_id: string | null;
  related_job_offer: string | null;
  has_bcc: boolean;
  bcc_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class JobOfferEmailService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_BASE_URL;

  getEmails(filters?: {
    direction?: EmailDirection;
    status?: string;
    has_bcc?: boolean;
    search?: string;
  }): Observable<JobOfferEmail[]> {
    let params = new HttpParams();

    if (filters?.direction) {
      params = params.set('direction', filters.direction);
    }

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    if (typeof filters?.has_bcc === 'boolean') {
      params = params.set('has_bcc', String(filters.has_bcc));
    }

    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<JobOfferEmail[]>(`${this.apiUrl}/api/job-offer-emails`, {
      params
    });
  }
}

