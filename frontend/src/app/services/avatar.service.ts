import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Avatar } from '../components/avatar/avatar';

@Injectable({
  providedIn: 'root'
})
export class AvatarService {

  private avatarUrl = 'assets/json/avatar.json';

  constructor(private http: HttpClient) {}

  getAvatars(): Observable<Avatar[]> {
    return this.http.get<Avatar[]>(this.avatarUrl);
  }
}