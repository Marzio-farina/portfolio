import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)');
  currentMode = signal<ThemeMode>('system');

  init(): ThemeMode {
    // Forza sempre la modalità di sistema: nessun attributo, CSS gestisce via media query
    this.apply('system');

    // Se il device cambia tema (es. dopo il tramonto), il CSS si aggiorna automaticamente.
    // Non serve alcun handler, ma se in futuro si volesse forzare light/dark,
    // basterebbe impostare data-theme con this.set('light'|'dark').
    return this.currentMode();
  }

  // Manteniamo l'API per eventuale uso futuro, ma per ora non viene chiamata.
  set(mode: ThemeMode): void {
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    const root = document.documentElement;
    this.currentMode.set(mode);

    if (mode === 'system') {
      root.removeAttribute('data-theme');
      return;
    }

    root.setAttribute('data-theme', mode);
  }
}
