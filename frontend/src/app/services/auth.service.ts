import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IdleService } from './idle.service';

export interface LoginDto { email: string; password: string; }
export interface RegisterDto { name: string; email: string; password: string; }
export interface AuthResponse { token: string; user: { id: number; name: string; email: string; }; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private idle = inject(IdleService);

  token = signal<string | null>(localStorage.getItem('auth_token'));

  isAuthenticated() { return !!this.token(); }

  private setToken(t: string | null) {
    this.token.set(t);
    if (t) localStorage.setItem('auth_token', t);
    else localStorage.removeItem('auth_token');
    this.idle.onAuthStateChanged();
  }

  login(dto: {email:string; password:string}) {
    return this.http.post<any>('/api/login', dto).pipe(
      tap(res => this.setToken(res.token))
    );
  }

  register(dto: {name:string; email:string; password:string}) {
    return this.http.post<any>('/api/register', dto).pipe(
      tap(res => this.setToken(res.token))
    );
  }

  forgotPassword(email: string) {
    return this.http.post('/api/auth/forgot-password', { email });
  }

  logout() {
    this.setToken(null);
    // opzionale: chiama anche il backend
    // this.http.post('/api/logout', {}).subscribe({ next: ()=>{}, error: ()=>{} });
  }
}