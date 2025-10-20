import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface LoginDto { email: string; password: string; }
export interface RegisterDto { name: string; email: string; password: string; }
export interface AuthResponse { token: string; user: { id: number; name: string; email: string; }; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  // piccolo store interno opzionale
  token = signal<string | null>(this.readToken());

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', dto)
      .pipe(tap(res => this.setToken(res.token)));
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', dto)
      .pipe(tap(res => this.setToken(res.token)));
  }

  forgotPassword(email: string) {
    return this.http.post('/api/auth/forgot-password', { email });
  }

  logout() { this.clearToken(); }

  // — helpers token —
  private setToken(t: string) { this.token.set(t); localStorage.setItem('auth_token', t); }
  private readToken() { return localStorage.getItem('auth_token'); }
  private clearToken() { this.token.set(null); localStorage.removeItem('auth_token'); }
}