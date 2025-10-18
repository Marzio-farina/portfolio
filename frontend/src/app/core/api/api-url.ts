import { environment } from '../../../environments/environment';

// Normalizza la base (niente slash finale)
const BASE = (environment.API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Costruisce l'URL API corretto in dev/prod.
 * Se la BASE termina con /api, NON aggiunge /api.
 * Altrimenti, lo aggiunge.
 * Passa sempre path a partire da "/" (es. "/ping", "/testimonials").
 */
export function apiUrl(pathAfterApi: string): string {
  const p = pathAfterApi.replace(/^\/+/, ''); // toglie eventuale '/' iniziale
  return `${BASE}/api/${p}`;
}