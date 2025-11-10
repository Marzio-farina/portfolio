import { Component, OnInit, inject } from '@angular/core';
import { OAuthService } from '../../services/oauth.service';

/**
 * Componente per gestire il callback OAuth
 * Riceve il token dall'URL e completa l'autenticazione
 */
@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `
    <div class="oauth-callback-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Completamento autenticazione...</p>
      </div>
    </div>
  `,
  styles: [`
    .oauth-callback-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-primary);
    }

    .loading-spinner {
      text-align: center;
    }

    .spinner {
      border: 4px solid var(--border-primary);
      border-top: 4px solid var(--accent-primary);
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  private oauthService = inject(OAuthService);

  ngOnInit(): void {
    this.oauthService.handleCallback();
  }
}

