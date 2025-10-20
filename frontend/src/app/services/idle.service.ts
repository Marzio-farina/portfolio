import { Injectable, NgZone } from '@angular/core';
import { fromEvent, merge, Subject, timer } from 'rxjs';
import { switchMap, startWith, takeUntil } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private stop$ = new Subject<void>();
  private timeout$ = new Subject<void>();
  onTimeout$ = this.timeout$.asObservable();

  // tempo max inattività (es. 15 minuti)
  private idleMs = 15 * 60 * 1000;

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

    this.zone.runOutsideAngular(() => {
      activity$.pipe(
        startWith(null),
        switchMap(() => timer(this.idleMs)),
        takeUntil(this.stop$)
      ).subscribe(() => {
        this.zone.run(() => this.timeout$.next());
      });
    });
  }

  stop() {
    this.stop$.next();
  }
}