import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../core/api/api-url';
import { BaseApiService } from '../core/api/base-api.service';
import { Category } from '../core/models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService extends BaseApiService {
  list$(): Observable<Category[]> {
    const url = apiUrl('categories');
    return this.cachedGet<Category[]>(url);
  }
}


