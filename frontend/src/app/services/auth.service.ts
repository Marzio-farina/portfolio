import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginDto { email: string; password: string; }
export interface RegisterDto { name: string; email: string; password: string; }
export interface AuthResponse { token: string; user: { id: number; name: string; email: string; }; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.API_BASE_URL;

  token = signal<string | null>(localStorage.getItem('auth_token'));

  isAuthenticated() { return !!this.token(); }

  private setToken(t: string | null) {
    this.token.set(t);
    if (t) localStorage.setItem('auth_token', t);
    else   localStorage.removeItem('auth_token');
  }

  login(dto: LoginDto) {
    return this.http.post<AuthResponse>(`${this.api}/api/login`, dto).pipe(
      tap(res => this.setToken(res.token))
    );
  }

  register(dto: RegisterDto) {
    return this.http.post<AuthResponse>(`${this.api}/api/register`, dto).pipe(
      tap(res => this.setToken(res.token))
    );
  }

  forgotPassword(email: string) {
    return this.http.post('/api/auth/forgot-password', { email });
  }

  logout() {
    this.setToken(null);
    // opzionale: this.http.post('/api/logout', {}).subscribe();
  }
}