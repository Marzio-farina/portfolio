import { environment } from '../../../environments/environment';

// Normalizza la base (niente slash finale)
const RAW = (environment.API_BASE_URL || '').replace(/\/+$/, '');

// Se la base NON finisce con /api, aggiungilo; altrimenti lascia così
const BASE = /\/api$/i.test(RAW) ? RAW : `${RAW}/api`;

/**
 * Passa path senza slash iniziale o con (indifferente).
 * Esempi:
 *  - apiUrl('ping') => https://.../api/ping
 *  - apiUrl('/testimonials') => https://.../api/testimonials
 */
export function apiUrl(pathAfterApi: string): string {
  const p = pathAfterApi.replace(/^\/+/, ''); // toglie eventuale '/' iniziale
  return `${BASE}/${p}`;
}