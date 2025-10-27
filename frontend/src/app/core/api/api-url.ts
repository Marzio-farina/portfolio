import { environment } from '../../../environments/environment';

// Usa esattamente la base fornita dalle environment (senza slash finale)
const BASE = (environment.API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Costruisce l'URL partendo dalla base configurata; non aggiunge /api automaticamente.
 */
export function apiUrl(path: string): string {
  const p = path.replace(/^\/+/, '');
  return `${BASE}/${p}`;
}