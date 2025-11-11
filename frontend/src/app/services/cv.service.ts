import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map, filter } from 'rxjs';
import { apiUrl } from '../core/api/api-url';
import { CvResponse, CvDto } from '../core/models/cv';

export type TimelineItem = {
  title: string;
  years: string;
  description: string;
};

export interface CvUi {
  education: TimelineItem[];
  experience: TimelineItem[];
}

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly http = inject(HttpClient);

  get$(userId?: number): Observable<CvUi> {
    const url = apiUrl('cv');
    const options: any = userId 
      ? { params: { user_id: String(userId), _t: Date.now().toString() } } 
      : { params: { _t: Date.now().toString() } }; // Cache busting
    
    return this.http.get<CvResponse>(url, { 
      ...options, 
      observe: 'events', 
      reportProgress: false,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).pipe(
      filter((e): e is HttpResponse<CvResponse> => e instanceof HttpResponse),
      map(e => (e.body as CvResponse)),
      map((res: CvResponse) => ({
        education: (res.education ?? []).map((r: CvDto) => ({
          title: r.title,
          years: r.years,
          description: r.description ?? '',
        })),
        experience: (res.experience ?? []).map((r: CvDto) => ({
          title: r.title,
          years: r.years,
          description: r.description ?? '',
        })),
      }))
    );
  }
}