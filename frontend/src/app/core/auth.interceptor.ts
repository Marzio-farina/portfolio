import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Legge il token dallo slug corrente per evitare dipendenza circolare
    // (AuthService → HttpClient → HTTP_INTERCEPTORS → AuthInterceptor)
    const token = this.getCurrentTokenFromUrl();
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    return next.handle(authReq);
  }
  
  /**
   * Ottiene il token per lo slug corrente estraendolo dall'URL del browser
   * - /about → auth_token_main (utente principale)
   * - /{slug}/about → auth_token_{slug}
   */
  private getCurrentTokenFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p);
    
    // Se il primo segmento non è una pagina nota (about, progetti, etc.), è uno slug
    const knownPages = ['about', 'progetti', 'attestati', 'contacts', 'job-offers'];
    const slug = parts.length > 0 && !knownPages.includes(parts[0]) ? parts[0] : null;
    
    const tokenKey = slug ? `auth_token_${slug}` : 'auth_token_main';
    const token = localStorage.getItem(tokenKey);
    
    // Fallback: prova anche con il token legacy per retrocompatibilità
    if (!token && !slug) {
      return localStorage.getItem('auth_token');
    }
    
    return token;
  }
}