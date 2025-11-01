import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AboutProfileService, SocialLink } from '../../services/about-profile.service';
import { GitHubService, RepoStats } from '../../services/github.service';
import { GitHubRepositoryService } from '../../services/github-repository.service';
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
  private readonly githubRepo = inject(GitHubRepositoryService);
  private readonly auth = inject(AuthService);
  private readonly editMode = inject(EditModeService);

  // Profilo utente per ottenere social accounts
  profile = signal<{ socials: SocialLink[] } | null>(null);
  
  // Repository GitHub dell'utente (array per supportare multiple repository)
  repositories = signal<Array<{ id: number; owner: string; repo: string; url: string; order: number }>>([]);
  
  // Statistiche GitHub per ogni repository (Map: url -> stats)
  repoStatsMap = signal<Map<string, RepoStats>>(new Map());
  userTotalCommits = signal<number>(0);
  loadingRepos = signal(true);
  loadingUserCommits = signal(true);
  
  // Drag and drop state
  draggedIndex = signal<number | null>(null);
  
  // Stato edit
  isAuthenticated = computed(() => this.auth.isAuthenticated());
  isEditing = computed(() => this.editMode.isEditing());
  canEdit = computed(() => this.isAuthenticated() && this.isEditing());
  
  // Form per aggiungere repository
  showForm = signal(false);
  githubUrl = signal('');
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Link GitHub dal profilo social (es: https://github.com/Marzio-farina)
  githubSocialLink = computed(() => {
    const socials = this.profile()?.socials || [];
    return socials.find(s => s.provider === 'github');
  });
  
  // Username GitHub estratto dal social link
  githubUsername = computed(() => {
    const link = this.githubSocialLink();
    if (!link?.url) return null;
    
    // Estrai username da URL (es: https://github.com/Marzio-farina)
    const match = link.url.match(/github\.com\/([^\/]+)/);
    return match ? match[1] : null;
  });

  constructor() {
    // Carica il profilo per ottenere i social links
    this.aboutProfile.get$().subscribe({
      next: (profile) => {
        this.profile.set(profile);
      },
      error: (err) => {
        console.error('Errore caricamento profilo:', err);
        this.loadingUserCommits.set(false);
      }
    });

    // Carica tutte le repository GitHub dell'utente
    this.loadRepositories();

    // Effect per caricare il totale commit dell'utente (da social_accounts)
    effect(() => {
      const username = this.githubUsername();
      if (username) {
        this.loadingUserCommits.set(true);
        this.github.getUserTotalCommits$(username).subscribe({
          next: (total) => {
            this.userTotalCommits.set(total);
            this.loadingUserCommits.set(false);
          },
          error: () => {
            this.loadingUserCommits.set(false);
          }
        });
      } else {
        this.loadingUserCommits.set(false);
      }
    });

    // Effect per caricare statistiche di tutte le repository
    effect(() => {
      const repos = this.repositories();
      if (repos.length > 0) {
        // Carica statistiche per ogni repository
        repos.forEach(repo => {
          this.github.getFullRepoStats$(repo.url).subscribe({
            next: (stats) => {
              if (stats) {
                this.repoStatsMap.update(map => {
                  const newMap = new Map(map);
                  newMap.set(repo.url, stats);
                  return newMap;
                });
              }
            },
            error: () => {
              console.error('Errore caricamento stats per', repo.url);
            }
          });
        });
      }
    });
  }

  /**
   * Carica tutte le repository GitHub dell'utente
   */
  private loadRepositories(): void {
    this.loadingRepos.set(true);
    this.githubRepo.getAll$().subscribe({
      next: (repos) => {
        this.repositories.set(repos);
        this.loadingRepos.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento repositories:', err);
        this.loadingRepos.set(false);
      }
    });
  }

  /**
   * Ottiene le statistiche per una specifica repository
   */
  getStatsForRepo(url: string): RepoStats | null {
    return this.repoStatsMap().get(url) || null;
  }

  /**
   * Mostra il form per aggiungere repository
   */
  onAddRepository(): void {
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  /**
   * Elimina una repository
   */
  onDeleteRepository(id: number, repoName: string): void {
    if (!confirm(`Vuoi eliminare la repository "${repoName}"?`)) {
      return;
    }

    this.githubRepo.delete$(id).subscribe({
      next: () => {
        console.log('[AsideSecondary] ✅ Repository eliminata');
        // Ricarica tutte le repository
        this.loadRepositories();
        
        // Rimuovi le statistiche dalla mappa
        this.repoStatsMap.update(map => {
          const newMap = new Map(map);
          const repo = this.repositories().find(r => r.id === id);
          if (repo) {
            newMap.delete(repo.url);
          }
          return newMap;
        });
      },
      error: (err) => {
        console.error('[AsideSecondary] ❌ Errore eliminazione repository:', err);
      }
    });
  }

  /**
   * Gestione Drag and Drop
   */
  onDragStart(event: DragEvent, index: number): void {
    this.draggedIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    const dragIndex = this.draggedIndex();
    
    if (dragIndex === null || dragIndex === dropIndex) {
      this.draggedIndex.set(null);
      return;
    }

    // Riordina l'array
    const repos = [...this.repositories()];
    const [draggedItem] = repos.splice(dragIndex, 1);
    repos.splice(dropIndex, 0, draggedItem);

    // Aggiorna gli indici order
    const updatedRepos = repos.map((repo, idx) => ({
      ...repo,
      order: idx
    }));

    // Aggiorna localmente
    this.repositories.set(updatedRepos);
    this.draggedIndex.set(null);

    // Salva il nuovo ordine nel backend
    const orderData = updatedRepos.map(repo => ({
      id: repo.id,
      order: repo.order
    }));

    this.githubRepo.updateOrder$(orderData).subscribe({
      next: () => {
        console.log('[AsideSecondary] ✅ Ordine aggiornato');
      },
      error: (err) => {
        console.error('[AsideSecondary] ❌ Errore aggiornamento ordine:', err);
        // Ricarica in caso di errore
        this.loadRepositories();
      }
    });
  }

  onDragEnd(): void {
    this.draggedIndex.set(null);
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

    // Estrai owner e repo dal URL (es: "Marzio-farina" e "portfolio")
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      this.errorMessage.set('URL non valido. Usa il formato: https://github.com/owner/repository');
      this.saving.set(false);
      return;
    }

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, ''); // Rimuovi .git se presente

    console.log('[AsideSecondary] Owner:', owner, 'Repo:', repo);
    console.log('[AsideSecondary] Invio richiesta al backend...');

    const payload = {
      owner: owner,
      repo: repo,
      url: url
    };

    console.log('[AsideSecondary] Payload:', payload);

    this.githubRepo.create$(payload).subscribe({
      next: (response) => {
        console.log('[AsideSecondary] ✅ Risposta backend:', response);
        this.saving.set(false);
        this.showForm.set(false);
        this.githubUrl.set('');
        
        // Ricarica tutte le repository
        console.log('[AsideSecondary] Ricaricamento repositories...');
        this.loadRepositories();
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

}

