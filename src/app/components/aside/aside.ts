import { Component, Inject, PLATFORM_ID, computed, effect, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map, startWith } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { Avatar } from "../avatar/avatar";

@Component({
  selector: 'app-aside',
  standalone: true,
  templateUrl: './aside.html',
  styleUrl: './aside.css',
  animations: [
    trigger('expandCollapse', [
      // quando appare
      transition(':enter', [
        style({ height: 0, opacity: 0, transform: 'translateY(-4px)' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1, transform: 'translateY(0)' })),
      ]),
      // quando scompare
      transition(':leave', [
        style({ height: '*', opacity: 1 }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
  imports: [Avatar],
})
export class Aside {
  private readonly LARGE_MIN = 1250;
  private readonly SMALL_MAX = 580;

  readonly isBrowser: boolean;
  readonly width;
  readonly viewMode;
  readonly expanded = signal(false);
  readonly showContacts;
  readonly showButton;
  readonly isSmall;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.width = this.isBrowser
      ? toSignal(
          fromEvent(window, 'resize').pipe(
            startWith(null),
            map(() => window.innerWidth)
          ),
          { initialValue: window.innerWidth }
        )
      : signal<number>(1280);

    this.viewMode = computed<'small' | 'medium' | 'large'>(() => {
      const w = this.width();
      if (w >= this.LARGE_MIN) return 'large';
      if (w < this.SMALL_MAX) return 'small';
      return 'medium';
    });

    effect(() => {
      this.expanded.set(this.viewMode() === 'large');
    });

    this.showContacts = computed(() => this.viewMode() === 'large' || this.expanded());
    this.showButton   = computed(() => this.viewMode() !== 'large');
    this.isSmall      = computed(() => this.viewMode() === 'small');
  }

  toggleContacts() {
    if (this.viewMode() !== 'large') this.expanded.update(v => !v);
  }
}