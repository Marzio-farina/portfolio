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

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  has_more: boolean;
}

export interface EmailStats {
  total: number;
  by_direction: {
    sent: number;
    received: number;
  };
  by_status: {
    sent: number;
    received: number;
    queued: number;
    failed: number;
  };
  by_category: {
    vip: number;
    drafts: number;
    junk: number;
    trash: number;
    archive: number;
  };
  with_bcc: number;
}

export interface PaginatedEmailResponse {
  data: JobOfferEmail[];
  pagination: PaginationMeta;
  stats?: EmailStats;
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
    category?: string;
    page?: number;
    per_page?: number;
  }): Observable<PaginatedEmailResponse> {
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

    if (filters?.category) {
      params = params.set('category', filters.category);
    }

    if (filters?.page) {
      params = params.set('page', String(filters.page));
    }

    if (filters?.per_page) {
      params = params.set('per_page', String(filters.per_page));
    }

    return this.http.get<PaginatedEmailResponse>(`${this.apiUrl}/api/job-offer-emails`, {
      params
    });
  }
}

