import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../core/api/api-url';
import { BaseApiService } from '../core/api/base-api.service';
import { Technology } from '../core/models/project';

@Injectable({ providedIn: 'root' })
export class TechnologyService extends BaseApiService {
  list$(): Observable<Technology[]> {
    const url = apiUrl('technologies');
    return this.cachedGet<Technology[]>(url);
  }
}


