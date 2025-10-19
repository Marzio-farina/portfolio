import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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

  get$(): Observable<WhatIDoItem[]> {
    return this.http.get<WhatIDoResponse>(apiUrl('what-i-do')).pipe(
      map(res => res.items ?? [])
    );
  }
}