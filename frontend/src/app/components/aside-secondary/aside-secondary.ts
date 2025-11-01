import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AboutProfileService, SocialLink } from '../../services/about-profile.service';
import { GitHubService, RepoStats } from '../../services/github.service';
import { SocialAccountService } from '../../services/social-account.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';

/**
 * Componente secondario sotto l'aside principale
 * Visibile solo su schermi >= 1250px
 * Mostra statistiche GitHub del portfolio
 */
@Component({
  selector: 'app-aside-secondary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aside-secondary.html',
  styleUrl: './aside-secondary.css'
})
export class AsideSecondary {
  private readonly aboutProfile = inject(AboutProfileService);
  private readonly github = inject(GitHubService);
  private readonly socialAccount = inject(SocialAccountService);
  private readonly auth = inject(AuthService);
  private readonly editMode = inject(EditModeService);

  // Segnale per il profilo utente
  profile = signal<{ socials: SocialLink[] } | null>(null);
  
  // Statistiche GitHub
  repoStats = signal<RepoStats | null>(null);
  loading = signal(true);
  
  // Stato edit
  isAuthenticated = computed(() => this.auth.isAuthenticated());
  isEditing = computed(() => this.editMode.isEditing());
  canEdit = computed(() => this.isAuthenticated() && this.isEditing());
  
  // Form per aggiungere repository
  showForm = signal(false);
  githubUrl = signal('');
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Link GitHub estratto dai social
  githubLink = computed(() => {
    const socials = this.profile()?.socials || [];
    return socials.find(s => s.provider === 'github');
  });

  constructor() {
    // Carica il profilo utente
    this.aboutProfile.get$().subscribe({
      next: (profile) => {
        this.profile.set(profile);
      },
      error: (err) => {
        console.error('Errore caricamento profilo:', err);
        this.loading.set(false);
      }
    });

    // Effect per caricare statistiche GitHub quando viene trovato il link
    effect(() => {
      const link = this.githubLink();
      if (link?.url) {
        this.loading.set(true);
        this.github.getFullRepoStats$(link.url).subscribe({
          next: (stats) => {
            this.repoStats.set(stats);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          }
        });
      } else {
        this.loading.set(false);
      }
    });
  }

  /**
   * Mostra il form per aggiungere repository
   */
  onAddRepository(): void {
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  /**
   * Annulla l'aggiunta repository
   */
  onCancel(): void {
    this.showForm.set(false);
    this.githubUrl.set('');
    this.errorMessage.set(null);
  }

  /**
   * Salva la repository GitHub
   */
  onSave(): void {
    const url = this.githubUrl().trim();
    
    console.log('[AsideSecondary] Tentativo di salvataggio URL:', url);
    
    if (!url) {
      this.errorMessage.set('Inserisci un URL valido');
      return;
    }

    // Verifica che sia un URL GitHub
    if (!url.includes('github.com')) {
      this.errorMessage.set('L\'URL deve essere un repository GitHub');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    // Estrai handle dal URL (es: "Marzio-farina/portfolio")
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    const handle = match ? match[1] : null;

    console.log('[AsideSecondary] Handle estratto:', handle);
    console.log('[AsideSecondary] Invio richiesta al backend...');

    const payload = {
      provider: 'github',
      handle: handle,
      url: url
    };

    console.log('[AsideSecondary] Payload:', payload);

    this.socialAccount.upsert$(payload).subscribe({
      next: (response) => {
        console.log('[AsideSecondary] ✅ Risposta backend:', response);
        this.saving.set(false);
        this.showForm.set(false);
        this.githubUrl.set('');
        
        // Invalida la cache e ricarica il profilo per aggiornare i social
        console.log('[AsideSecondary] Invalidazione cache...');
        this.aboutProfile.clearCache();
        
        console.log('[AsideSecondary] Ricaricamento profilo...');
        this.aboutProfile.get$().subscribe({
          next: (profile) => {
            console.log('[AsideSecondary] ✅ Profilo ricaricato:', profile);
            this.profile.set(profile);
          },
          error: (err) => {
            console.error('[AsideSecondary] ❌ Errore ricaricamento profilo:', err);
          }
        });
      },
      error: (err) => {
        console.error('[AsideSecondary] ❌ Errore salvataggio GitHub:', err);
        console.error('[AsideSecondary] Status:', err?.status);
        console.error('[AsideSecondary] Error object:', err?.error);
        this.saving.set(false);
        
        let message = 'Errore durante il salvataggio';
        if (err?.status === 401) {
          message = 'Non sei autenticato. Effettua il login.';
        } else if (err?.status === 422) {
          message = err?.error?.message || 'Dati non validi';
        } else if (err?.error?.message) {
          message = err.error.message;
        }
        
        this.errorMessage.set(message);
      }
    });
  }

  /**
   * Formatta numeri grandi con suffissi (1.2k, 3.4M, etc.)
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }
}

