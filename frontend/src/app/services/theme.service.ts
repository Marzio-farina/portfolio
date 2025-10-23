import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'portfolio-theme';
  
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
  }

  /**
   * Imposta il tema
   */
  setTheme(theme: Theme): void {
    this._currentTheme.set(theme);
    this.saveTheme(theme);
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
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      this._currentTheme.set(saved);
    } else {
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
    if (theme === 'auto') {
      // Rileva il tema del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._effectiveTheme.set(prefersDark ? 'dark' : 'light');
    } else {
      this._effectiveTheme.set(theme);
    }
  }

  /**
   * Applica il tema al documento
   */
  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      // Rimuovi data-theme per usare il CSS automatico
      root.removeAttribute('data-theme');
    } else {
      // Imposta data-theme esplicito
      root.setAttribute('data-theme', theme);
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
}