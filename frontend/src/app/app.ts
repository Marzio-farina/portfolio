import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Aside } from "./components/aside/aside";
import { Navbar } from "./components/navbar/navbar";
import { Dashboard } from "./components/dashboard/dashboard";
import { AuthService } from './services/auth.service';
import { IdleService } from './services/idle.service';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [Aside, Navbar, Dashboard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Portfolio');
  private auth = inject(AuthService);
  private idle = inject(IdleService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  constructor() {
    // imposta timeout inattività (es. 15 min)
    this.idle.configure(15 * 60 * 1000);

    // se l’utente è loggato → avvia monitoraggio inattività
    effect(() => {
      if (this.auth.isAuthenticated()) this.idle.start();
      else this.idle.stop();
    });

    // quando scade l'inattività → logout e redirect
    this.idle.onTimeout$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.auth.logout();
        this.router.navigateByUrl('/auth');
        // qui puoi anche mostrare un messaggio tipo toast
        console.warn('Sessione scaduta per inattività.');
      });
  }
}