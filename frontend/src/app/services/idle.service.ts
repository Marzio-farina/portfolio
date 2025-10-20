import { Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subject, timer } from 'rxjs';
import { switchMap, startWith, takeUntil } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private router = inject(Router);
  private auth = inject(AuthService);
  private zone = inject(NgZone);

  // tempo max inattività (es. 15 minuti)
  private readonly IDLE_MS = 15 * 60 * 1000;

  private stop$ = new Subject<void>();
  private activity$ = merge(
    fromEvent(document, 'mousemove'),
    fromEvent(document, 'keydown'),
    fromEvent(document, 'click'),
    fromEvent(window, 'scroll'),
    fromEvent(window, 'focus')
  );

  start() {
    // parte solo se utente loggato
    if (!this.auth.isAuthenticated()) return;
    this.zone.runOutsideAngular(() => {
      this.activity$.pipe(
        startWith(null),
        switchMap(() => timer(this.IDLE_MS)),
        takeUntil(this.stop$)
      ).subscribe(() => {
        this.zone.run(() => {
          this.auth.logout(); // pulizia token
          // opzionale: messaggio UI
          // this.toast.warn('Sessione scaduta per inattività');
          this.router.navigateByUrl('/auth');
        });
      });
    });
  }

  stop() {
    this.stop$.next();
  }

  // da chiamare su ogni cambio auth
  onAuthStateChanged() {
    this.stop();
    if (this.auth.isAuthenticated()) this.start();
  }
}