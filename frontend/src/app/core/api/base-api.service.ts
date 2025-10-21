import { inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

// helper per chiave cache
function cacheKey(url: string, params?: Record<string, any>): string {
  return params ? url + '?' + new HttpParams({ fromObject: params }).toString() : url;
}

export abstract class BaseApiService {
  protected http = inject(HttpClient);
  // cache per GET: chiave = full url + params serializzati
  private cache = new Map<string, Observable<any>>();

  protected cachedGet<T>(url: string, params?: Record<string, any>): Observable<T> {
    const key = cacheKey(url, params);
    const found = this.cache.get(key) as Observable<T> | undefined;
    if (found) return found;

    const obs = this.http.get<T>(url, { params }).pipe(
      // opzionale: normalizzazioni comuni
      map((x) => x),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.cache.set(key, obs);
    return obs;
  }

  /** Invalida la cache per un url (o tutto se non passi nulla) */
  protected invalidate(url?: string) {
    if (!url) this.cache.clear();
    else {
      [...this.cache.keys()].forEach(k => { if (k.startsWith(url)) this.cache.delete(k); });
    }
  }
}