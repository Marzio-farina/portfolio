import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AvatarData } from '../components/avatar/avatar';
import { apiUrl } from '../core/api/api-url';

@Injectable({
  providedIn: 'root'
})
export class DefaultAvatarService {

  constructor(private http: HttpClient) {}

  getDefaultAvatars(): Observable<AvatarData[]> {
    return this.http.get<{avatars: AvatarData[]}>(apiUrl('testimonials/default-avatars')).pipe(
      map(response => response.avatars)
    );
  }
}
