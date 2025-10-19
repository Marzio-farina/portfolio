import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../core/api/api-url';
import { CvResponse } from '../core/models/cv';

export type TimelineItem = {
  title: string;
  years: string;
  description: string
};

export interface CvUi {
  education: TimelineItem[];
  experience: TimelineItem[];
}

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly http = inject(HttpClient);

  get$(): Observable<CvUi> {
    return this.http.get<CvResponse>(apiUrl('cv')).pipe(
      map(res => ({
        education: (res.education ?? []).map(r => ({
          title: r.title,
          years: r.years,
          description: r.description ?? '',
        })),
        experience: (res.experience ?? []).map(r => ({
          title: r.title,
          years: r.years,
          description: r.description ?? '',
        })),
      }))
    );
  }
}