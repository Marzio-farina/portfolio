import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'portfolio-theme';
  private readonly USER_CHOICE_KEY = 'portfolio-theme-user-choice';
  
  // Signal per il tema corrente
  private _currentTheme = signal<Theme>('auto');
  public currentTheme = this._currentTheme.asReadonly();
  
  // Signal per il tema effettivo (light/dark)
  private _effectiveTheme = signal<'light' | 'dark'>('light');
  public effectiveTheme = this._effectiveTheme.asReadonly();

  constructor() {
    // Carica il tema salvato o usa 'auto'
    this.loadTheme();
    
    // Effect per aggiornare il tema effettivo
    effect(() => {
      const theme = this._currentTheme();
      this.updateEffectiveTheme(theme);
      this.applyTheme(theme);
    });

    // Listener per cambiamenti del tema del sistema
    this.setupSystemThemeListener();
  }

  /**
   * Imposta il tema
   */
  setTheme(theme: Theme, isUserChoice: boolean = true): void {
    this._currentTheme.set(theme);
    this.saveTheme(theme);
    
    // Traccia se è una scelta dell'utente
    if (isUserChoice) {
      localStorage.setItem(this.USER_CHOICE_KEY, 'true');
    }
  }

  /**
   * Toggle tra light e dark (ignora auto)
   */
  toggleTheme(): void {
    const current = this._currentTheme();
    if (current === 'auto') {
      // Se è auto, passa a light
      this.setTheme('light');
    } else if (current === 'light') {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  /**
   * Carica il tema salvato dal localStorage
   */
  private loadTheme(): void {
    const saved = localStorage.getItem(this.THEME_KEY) as Theme;
    const hasUserChoice = localStorage.getItem(this.USER_CHOICE_KEY) === 'true';
    
    console.log('loadTheme - saved theme:', saved, 'hasUserChoice:', hasUserChoice);
    
    if (saved && ['light', 'dark', 'auto'].includes(saved) && hasUserChoice) {
      // L'utente ha fatto una scelta esplicita, usa quella
      console.log('Using user choice:', saved);
      this._currentTheme.set(saved);
    } else {
      // Nessuna scelta dell'utente, usa auto per seguire il browser
      console.log('No user choice found, setting to auto');
      this._currentTheme.set('auto');
    }
  }

  /**
   * Salva il tema nel localStorage
   */
  private saveTheme(theme: Theme): void {
    localStorage.setItem(this.THEME_KEY, theme);
  }

  /**
   * Aggiorna il tema effettivo basato sul tema corrente
   */
  private updateEffectiveTheme(theme: Theme): void {
    console.log('updateEffectiveTheme called with theme:', theme);
    
    if (theme === 'auto') {
      // Rileva il tema del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const effectiveTheme = prefersDark ? 'dark' : 'light';
      console.log('Auto theme - system prefers dark:', prefersDark, '-> effective theme:', effectiveTheme);
      this._effectiveTheme.set(effectiveTheme);
    } else {
      console.log('Fixed theme:', theme);
      this._effectiveTheme.set(theme);
    }
  }

  /**
   * Applica il tema al documento
   */
  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    console.log('applyTheme called with theme:', theme);
    
    if (theme === 'auto') {
      // Rimuovi data-theme per usare il CSS automatico
      root.removeAttribute('data-theme');
      console.log('Removed data-theme attribute for auto theme');
    } else {
      // Imposta data-theme esplicito
      root.setAttribute('data-theme', theme);
      console.log('Set data-theme attribute to:', theme);
    }
  }

  /**
   * Verifica se il tema corrente è dark
   */
  isDark(): boolean {
    return this._effectiveTheme() === 'dark';
  }

  /**
   * Verifica se il tema corrente è light
   */
  isLight(): boolean {
    return this._effectiveTheme() === 'light';
  }

  /**
   * Verifica se il tema è impostato su auto
   */
  isAuto(): boolean {
    return this._currentTheme() === 'auto';
  }

  /**
   * Resetta le preferenze dell'utente e torna al tema automatico
   */
  resetToAuto(): void {
    localStorage.removeItem(this.USER_CHOICE_KEY);
    this.setTheme('auto', false);
    console.log('Reset to auto theme - will follow system preference');
  }

  /**
   * Setup listener per cambiamenti del tema del sistema
   * Aggiorna automaticamente il tema quando l'utente cambia le preferenze del sistema
   */
  private setupSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        console.log('System theme changed:', e.matches ? 'dark' : 'light');
        console.log('Current theme setting:', this._currentTheme());
        
        // Aggiorna solo se il tema è impostato su 'auto'
        if (this._currentTheme() === 'auto') {
          console.log('Updating theme to match system preference');
          this.updateEffectiveTheme('auto');
          this.applyTheme('auto');
        }
      };

      // Aggiungi il listener
      mediaQuery.addEventListener('change', handleChange);
      
      // Debug: verifica lo stato iniziale
      console.log('Initial system theme:', mediaQuery.matches ? 'dark' : 'light');
      console.log('Current theme setting:', this._currentTheme());
      
      // Cleanup quando il servizio viene distrutto
      // (Angular gestisce automaticamente la pulizia dei servizi)
    }
  }
}