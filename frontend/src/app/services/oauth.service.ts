import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { LoggerService } from '../core/logger.service';

export type OAuthProvider = 'google' | 'github' | 'facebook';

export interface OAuthConfig {
  provider: OAuthProvider;
  name: string;
  icon: string;
  color: string;
}

/**
 * OAuth Service
 * 
 * Gestisce l'autenticazione tramite provider OAuth (Google, GitHub, Facebook, ecc.)
 */
@Injectable({ providedIn: 'root' })
export class OAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private logger = inject(LoggerService);

  private backendUrl = 'http://localhost:8000'; // TODO: spostare in environment

  /**
   * Configurazione dei provider OAuth disponibili
   */
  readonly providers: OAuthConfig[] = [
    {
      provider: 'google',
      name: 'Google',
      icon: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z',
      color: '#4285F4'
    },
    {
      provider: 'github',
      name: 'GitHub',
      icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
      color: '#333'
    },
    {
      provider: 'facebook',
      name: 'Facebook',
      icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
      color: '#1877F2'
    }
  ];

  /**
   * Inizia il flusso OAuth per un provider
   * Reindirizza l'utente alla pagina di autorizzazione del provider
   * 
   * @param provider Nome del provider (google, github, facebook)
   */
  loginWithProvider(provider: OAuthProvider): void {
    try {
      console.log(`🔐 Iniziando autenticazione OAuth con ${provider}`);
      
      // Redirect alla route backend che gestisce l'OAuth
      const oauthUrl = `${this.backendUrl}/api/auth/${provider}`;
      window.location.href = oauthUrl;
      
    } catch (error) {
      this.logger.error(`Errore durante l'avvio OAuth con ${provider}`, error);
    }
  }

  /**
   * Gestisce il callback OAuth dal backend
   * Estrae il token dall'URL e completa l'autenticazione
   */
  handleCallback(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const provider = params['provider'];
      const error = params['error'];

      if (error) {
        this.logger.error('OAuth error', { error, provider });
        this.router.navigate(['/'], {
          state: {
            toast: {
              message: `Errore autenticazione: ${error}`,
              type: 'error'
            }
          }
        });
        return;
      }

      if (token) {
        console.log(`✅ OAuth callback ricevuto da ${provider}`);
        
        // Prima carica i dati dell'utente per ottenere lo slug
        this.http.get<{ id: number; slug?: string }>(
          `${this.backendUrl}/api/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).subscribe({
          next: (user) => {
            // Determina lo slug corretto
            const userSlug = user.id === 1 ? null : user.slug;
            const tokenKey = userSlug ? `auth_token_${userSlug}` : 'auth_token_main';
            
            // Salva il token con la chiave corretta
            localStorage.setItem(tokenKey, token);
            console.log(`✅ OAuth: Token salvato per slug: ${userSlug || 'main'}`);
            
            // Aggiorna AuthService
            this.auth.token.set(token);
            this.auth.authenticatedUserId.set(user.id);
            
            // Refresh del profilo utente
            this.auth.refreshMe();
          },
          error: (err) => {
            console.error('Errore caricamento ID utente OAuth', err);
            // Fallback: salva come main se non riusciamo a ottenere i dati
            localStorage.setItem('auth_token_main', token);
            this.auth.token.set(token);
          }
        });
        
        // Redirect alla homepage dell'utente
        this.router.navigate(['/about'], {
          state: {
            toast: {
              message: `Benvenuto! Accesso eseguito con ${provider}`,
              type: 'success'
            }
          }
        });
      }
    });
  }
}
