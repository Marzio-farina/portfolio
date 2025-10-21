import { Signal, WritableSignal, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

export type Loadable<T> = {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  reload: () => void;
  _setSource: (obsFactory: () => Observable<T>) => void; // interno
};

/** Converte un Observable<T> in tripletta {data,loading,error} con reload() */
export function makeLoadable<T>(sourceFactory: () => Observable<T>): Loadable<T> {
  const data: WritableSignal<T | null> = signal<T | null>(null);
  const loading = signal<boolean>(true);
  const error = signal<string | null>(null);

  let sub: Subscription | null = null;

  const start = () => {
    // cancella sub precedente
    sub?.unsubscribe();
    loading.set(true);
    error.set(null);
    sub = sourceFactory().subscribe({
      next: (res) => { data.set(res); loading.set(false); },
      error: (err) => {
        // abort (status 0) spesso è rumore: lo escludiamo dalla UI
        if (err?.status === 0 || err?.name === 'CanceledError') {
          loading.set(false);
          return;
        }
        error.set(err?.message ?? 'Errore di rete');
        loading.set(false);
      }
    });
  };

  start();

  return {
    data,
    loading,
    error,
    reload: start,
    _setSource: (f) => { sourceFactory = f; start(); }
  };
}