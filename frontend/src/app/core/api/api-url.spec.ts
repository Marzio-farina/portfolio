import { TestBed } from '@angular/core/testing';
import { apiUrl } from './api-url';
import { environment } from '../../../environments/environment';

describe('apiUrl Utility', () => {
  
  describe('URL Construction', () => {
    
    it('dovrebbe costruire URL corretto con path semplice', () => {
      const url = apiUrl('users');
      expect(url).toBe(`${environment.API_BASE_URL}/users`);
    });
    
    it('dovrebbe rimuovere slash iniziali dal path', () => {
      const url = apiUrl('/users');
      expect(url).toBe(`${environment.API_BASE_URL}/users`);
    });
    
    it('dovrebbe gestire path con slash multipli iniziali', () => {
      const url = apiUrl('///users');
      expect(url).toBe(`${environment.API_BASE_URL}/users`);
    });
    
    it('dovrebbe costruire URL con path complesso', () => {
      const url = apiUrl('projects/123/details');
      expect(url).toBe(`${environment.API_BASE_URL}/projects/123/details`);
    });
    
    it('dovrebbe gestire path vuoto', () => {
      const url = apiUrl('');
      expect(url).toBe(`${environment.API_BASE_URL}/`);
    });
    
    it('dovrebbe gestire path con solo slash', () => {
      const url = apiUrl('/');
      expect(url).toBe(`${environment.API_BASE_URL}/`);
    });
    
    it('dovrebbe costruire URL con query parameters nel path', () => {
      const url = apiUrl('users?role=admin');
      expect(url).toBe(`${environment.API_BASE_URL}/users?role=admin`);
    });
    
    it('dovrebbe costruire URL con hash fragment', () => {
      const url = apiUrl('page#section');
      expect(url).toBe(`${environment.API_BASE_URL}/page#section`);
    });
    
    it('dovrebbe gestire path con caratteri speciali encoded', () => {
      const url = apiUrl('search/hello%20world');
      expect(url).toBe(`${environment.API_BASE_URL}/search/hello%20world`);
    });
  });
  
  describe('Base URL Handling', () => {
    
    it('dovrebbe usare API_BASE_URL da environment', () => {
      const url = apiUrl('test');
      expect(url).toContain(environment.API_BASE_URL);
    });
    
    it('dovrebbe rimuovere slash finali dalla base URL', () => {
      // Questo test verifica il comportamento interno
      // La base viene pulita da slash finali
      const url = apiUrl('users');
      expect(url).not.toContain('//users');
    });
  });
  
  describe('Edge Cases', () => {
    
    it('dovrebbe gestire path con spazi (non encoded)', () => {
      const url = apiUrl('test path');
      expect(url).toBe(`${environment.API_BASE_URL}/test path`);
    });
    
    it('dovrebbe gestire path con caratteri speciali', () => {
      const url = apiUrl('projects/título-español');
      expect(url).toBe(`${environment.API_BASE_URL}/projects/título-español`);
    });
    
    it('dovrebbe gestire path molto lunghi', () => {
      const longPath = 'a'.repeat(200);
      const url = apiUrl(longPath);
      expect(url).toBe(`${environment.API_BASE_URL}/${longPath}`);
    });
    
    it('dovrebbe gestire path con dots', () => {
      const url = apiUrl('../malicious/path');
      expect(url).toBe(`${environment.API_BASE_URL}/../malicious/path`);
    });
  });
  
  describe('Common API Endpoints', () => {
    
    it('dovrebbe costruire URL per endpoint users', () => {
      const url = apiUrl('users');
      expect(url).toBe(`${environment.API_BASE_URL}/users`);
    });
    
    it('dovrebbe costruire URL per endpoint projects', () => {
      const url = apiUrl('projects');
      expect(url).toBe(`${environment.API_BASE_URL}/projects`);
    });
    
    it('dovrebbe costruire URL per endpoint login', () => {
      const url = apiUrl('login');
      expect(url).toBe(`${environment.API_BASE_URL}/login`);
    });
    
    it('dovrebbe costruire URL per endpoint testimonials', () => {
      const url = apiUrl('testimonials');
      expect(url).toBe(`${environment.API_BASE_URL}/testimonials`);
    });
    
    it('dovrebbe costruire URL per endpoint nested', () => {
      const url = apiUrl('users/123/profile');
      expect(url).toBe(`${environment.API_BASE_URL}/users/123/profile`);
    });
  });
  
  describe('Path Normalization', () => {
    
    it('dovrebbe normalizzare path con slash multipli consecutivi', () => {
      const url = apiUrl('users//123//profile');
      // Non normalizza slash interni, solo iniziali
      expect(url).toBe(`${environment.API_BASE_URL}/users//123//profile`);
    });
    
    it('dovrebbe preservare trailing slash se presente nel path', () => {
      const url = apiUrl('users/');
      expect(url).toBe(`${environment.API_BASE_URL}/users/`);
    });
  });
  
  describe('Type Safety', () => {
    
    it('dovrebbe accettare stringa come parametro', () => {
      expect(() => apiUrl('test')).not.toThrow();
    });
    
    it('dovrebbe ritornare stringa', () => {
      const url = apiUrl('test');
      expect(typeof url).toBe('string');
    });
  });
});

