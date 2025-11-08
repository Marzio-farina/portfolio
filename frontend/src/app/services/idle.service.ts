import { Injectable, NgZone } from '@angular/core';
import { fromEvent, merge, Subject, timer, Observable, interval } from 'rxjs';
import { switchMap, startWith, takeUntil, map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private stop$ = new Subject<void>();
  private timeout$ = new Subject<void>();
  private warning$ = new Subject<number>(); // Emette i secondi rimanenti
  private reset$ = new Subject<void>(); // Emette quando l'utente torna attivo
  
  onTimeout$ = this.timeout$.asObservable();
  onWarning$ = this.warning$.asObservable(); // Observable per il countdown
  onReset$ = this.reset$.asObservable(); // Observable per reset attività

  // tempo max inattività (65 secondi per testing, normalmente 15 minuti)
  private idleMs = 65 * 1000;
  private warningMs = 60 * 1000; // Mostra warning 60 secondi prima

  private countdownInterval?: any;

  constructor(private zone: NgZone) {}

  configure(ms: number) { this.idleMs = ms; }

  start() {
    this.stop(); // reset precedente
    const activity$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'click'),
      fromEvent(window, 'scroll'),
      fromEvent(window, 'focus')
    );

    let isFirstActivity = true;

    this.zone.runOutsideAngular(() => {
      activity$.pipe(
        startWith(null),
        switchMap(() => {
          // Se non è la prima attività e il countdown è attivo, emetti reset
          if (!isFirstActivity && this.countdownInterval) {
            this.zone.run(() => {
              this.stopCountdown();
              this.reset$.next();
            });
          }
          isFirstActivity = false;

          // Calcola quando mostrare il warning
          const timeUntilWarning = this.idleMs - this.warningMs;
          
          // Timer per il warning (5 secondi = 65s - 60s)
          if (timeUntilWarning > 0) {
            timer(timeUntilWarning).subscribe(() => {
              this.zone.run(() => {
                this.startCountdown();
              });
            });
          }
          
          // Timer principale per il timeout
          return timer(this.idleMs);
        }),
        takeUntil(this.stop$)
      ).subscribe(() => {
        this.zone.run(() => {
          this.stopCountdown();
          this.timeout$.next();
        });
      });
    });
  }

  stop() {
    this.stopCountdown();
    this.stop$.next();
  }

  private startCountdown() {
    this.stopCountdown(); // Pulisci eventuali countdown precedenti
    
    let secondsLeft = Math.floor(this.warningMs / 1000); // 60 secondi
    
    // Emetti immediatamente il primo valore
    this.warning$.next(secondsLeft);
    
    // Poi emetti ogni secondo
    this.countdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft >= 0) {
        this.warning$.next(secondsLeft);
      } else {
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }
}