import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Legge il token direttamente dal localStorage per evitare dipendenza circolare
    // (AuthService → HttpClient → HTTP_INTERCEPTORS → AuthInterceptor)
    const token = localStorage.getItem('auth_token');
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    return next.handle(authReq);
  }
}