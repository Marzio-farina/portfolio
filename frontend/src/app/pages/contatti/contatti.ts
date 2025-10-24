import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Maps } from '../../components/maps/maps';
import { ContactForm } from '../../components/contact-form/contact-form';

@Component({
  selector: 'app-contatti',
  imports: [
    Maps,
    ContactForm
  ],
  templateUrl: './contatti.html',
  styleUrl: './contatti.css'
})
export class Contatti {
  private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });
  
  // Gestione notifiche
  errorMessage = () => this.currentError;
  private currentError?: string;

  onErrorChange(error: string | undefined) {
    this.currentError = error;
  }

  clearError() {
    this.currentError = undefined;
  }
}