import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AttestatiCard, Attestato } from '../../components/attestati-card/attestati-card';
import { AttestatiService } from '../../services/attestati.service';

@Component({
  selector: 'app-attestati',
  imports: [AttestatiCard],
  templateUrl: './attestati.html',
  styleUrl: './attestati.css'
})
export class Attestati {
  private route = inject(ActivatedRoute);
  private api   = inject(AttestatiService);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  // dati & stati
  attestati = signal<Attestato[]>([]);
  loading   = signal(true);
  errorMsg  = signal<string | null>(null);

  constructor() {
    this.api.listAll$(1000).subscribe({
      next: data => { this.attestati.set(data); this.loading.set(false); },
      error: _err => { this.errorMsg.set('Impossibile caricare gli attestati.'); this.loading.set(false); }
    });
  }
}