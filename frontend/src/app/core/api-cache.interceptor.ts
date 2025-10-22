import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { HttpContextToken } from '@angular/common/http';
import { finalize, Observable, shareReplay, Subject, Subscription, tap } from "rxjs";



// ---- Config base
type CacheEntry = { timestamp: number; response: HttpResponse<any>; etag?: string };
const TTL_MS = 5 * 60 * 1000; // 5 minuti

// ---- HttpContext flags (opt-in/opt-out per singola richiesta)

export const CACHE_BYPASS = new HttpContextToken<boolean>(() => false);  // se true, salta cache
export const CACHE_TTL     = new HttpContextToken<number>(() => TTL_MS); // TTL personalizzabile
export const CACHE_CRITICAL = new HttpContextToken<boolean>(() => false); // se true, non cancella richieste in volo

@Injectable()
export class ApiCacheInterceptor implements HttpInterceptor {
    private cache = new Map<string, CacheEntry>();
    private inflight = new Map<string, { subject: Subject<HttpEvent<any>>; sub: Subscription | null }>();

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Cache solo GET su /api/*, e se non è bypass
    const isCacheable = req.method === 'GET' && req.url.includes('/api/') && !req.context.get(CACHE_BYPASS);
    if (!isCacheable) return next.handle(req);

    const key = req.urlWithParams;
    const ttl = req.context.get(CACHE_TTL);

    const cached = this.cache.get(key);
    const now = Date.now();
    const fresh = !!cached && (now - cached.timestamp) < ttl;

    // Se ho etag, invia If-None-Match
    let request = req;
    if (cached?.etag) {
      request = req.clone({ setHeaders: { 'If-None-Match': cached.etag } });
    }

    // Se esiste già una request identica in volo
    const inflightExisting = this.inflight.get(key);
    const isCritical = req.context.get(CACHE_CRITICAL);
    
    if (inflightExisting) {
      if (isCritical) {
        // Per richieste critiche, riutilizza la richiesta esistente
        return inflightExisting.subject.asObservable();
      } else {
        // Per richieste normali, cancella la precedente e crea una nuova
        inflightExisting.sub?.unsubscribe();
        this.inflight.delete(key);
      }
    }

    // Crea nuovo “canale” per i subscriber
    const subject = new Subject<HttpEvent<any>>();
    const record = { subject, sub: null as Subscription | null };
    this.inflight.set(key, record);

    // Avvia la rete (timeout gestito da ErrorHandlerInterceptor)
    const network$ = next.handle(request).pipe(
      tap(evt => {
        if (evt instanceof HttpResponse) {
          // 304 → riusa la cache se c'è
          if (evt.status === 304 && cached) {
            subject.next(cached.response.clone());
            subject.complete();
            return;
          }
          // Salva in cache nuova risposta (con ETag se presente)
          const etag = evt.headers.get('ETag') || undefined;
          this.cache.set(key, { timestamp: Date.now(), response: evt.clone(), etag });
        }
      }),
      finalize(() => {
        this.inflight.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Sottoscrivi "internamente" così possiamo annullare se parte un'altra identica
    record.sub = network$.subscribe({
      next: ev => subject.next(ev),
      error: err => {
        console.warn('API Cache Interceptor - Network error:', err);
        subject.error(err);
      },
      complete: () => subject.complete(),
    });

    // SWR: consegna subito cache fresca, poi aggiorna quando arriva la rete
    if (fresh) {
      (queueMicrotask ?? ((fn: () => void) => setTimeout(fn, 0)))(() => subject.next(cached!.response.clone()));
    }

    return subject.asObservable();
  }
}