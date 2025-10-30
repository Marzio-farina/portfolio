import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map, filter } from 'rxjs';
import { apiUrl } from '../core/api/api-url';

export type WhatIDoItem = {
  id: number;
  title: string;
  description: string;
  icon: string;
};

export interface WhatIDoResponse {
  items: WhatIDoItem[];
}

@Injectable({ providedIn: 'root' })
export class WhatIDoService {
  private readonly http = inject(HttpClient);

  get$(userId?: number): Observable<WhatIDoItem[]> {
    const options: any = userId ? { params: { user_id: String(userId) } } : {};
    return this.http.get<WhatIDoResponse>(apiUrl('what-i-do'), { ...options, observe: 'events', reportProgress: false }).pipe(
      filter((e): e is HttpResponse<WhatIDoResponse> => e instanceof HttpResponse),
      map(e => (e.body as WhatIDoResponse)),
      map((res: WhatIDoResponse) => res.items ?? [])
    );
  }
}