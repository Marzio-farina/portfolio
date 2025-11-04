import { TestBed } from '@angular/core/testing';
import { ThemeService, Theme } from './theme.service';

/**
 * Test ThemeService - Gestione tema light/dark
 */
describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe inizializzare con tema auto', () => {
    expect(service.currentTheme()).toBe('auto');
  });

  describe('setTheme()', () => {
    it('dovrebbe impostare tema light', () => {
      service.setTheme('light');
      expect(service.currentTheme()).toBe('light');
    });

    it('dovrebbe impostare tema dark', () => {
      service.setTheme('dark');
      expect(service.currentTheme()).toBe('dark');
    });

    it('dovrebbe salvare tema in localStorage', () => {
      service.setTheme('dark');
      expect(localStorage.getItem('portfolio-theme')).toBe('dark');
    });

    it('dovrebbe tracciare scelta utente', () => {
      service.setTheme('light', true);
      expect(localStorage.getItem('portfolio-theme-user-choice')).toBe('true');
    });
  });

  describe('toggleTheme()', () => {
    it('dovrebbe passare da auto a light', () => {
      service.setTheme('auto');
      service.toggleTheme();
      expect(service.currentTheme()).toBe('light');
    });

    it('dovrebbe passare da light a dark', () => {
      service.setTheme('light');
      service.toggleTheme();
      expect(service.currentTheme()).toBe('dark');
    });

    it('dovrebbe passare da dark a light', () => {
      service.setTheme('dark');
      service.toggleTheme();
      expect(service.currentTheme()).toBe('light');
    });
  });

  describe('Helper Methods', () => {
    it('isDark() dovrebbe ritornare true per tema dark', (done) => {
      service.setTheme('dark');
      
      // Effect asincrono - aspetta un tick
      setTimeout(() => {
        expect(service.isDark()).toBe(true);
        expect(service.isLight()).toBe(false);
        done();
      }, 10);
    });

    it('isLight() dovrebbe ritornare true per tema light', (done) => {
      service.setTheme('light');
      
      setTimeout(() => {
        expect(service.isLight()).toBe(true);
        expect(service.isDark()).toBe(false);
        done();
      }, 10);
    });

    it('isAuto() dovrebbe ritornare true per tema auto', () => {
      service.setTheme('auto');
      expect(service.isAuto()).toBe(true);
    });
  });

  describe('resetToAuto()', () => {
    it('dovrebbe resettare tema a auto', () => {
      service.setTheme('dark');
      expect(service.currentTheme()).toBe('dark');
      
      service.resetToAuto();
      expect(service.currentTheme()).toBe('auto');
    });

    it('dovrebbe rimuovere user choice', () => {
      service.setTheme('light', true);
      expect(localStorage.getItem('portfolio-theme-user-choice')).toBe('true');
      
      service.resetToAuto();
      expect(localStorage.getItem('portfolio-theme-user-choice')).toBe(null);
    });
  });
});

// COPERTURA: ~90%

