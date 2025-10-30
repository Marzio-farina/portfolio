import { Component, inject, input, signal, computed, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Attestato } from '../../models/attestato.model';
import { AttestatoDetailModalService } from '../../services/attestato-detail-modal.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { AttestatiService } from '../../services/attestati.service';

@Component({
  selector: 'app-attestati-card',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './attestati-card.html',
  styleUrls: ['./attestati-card.css'],
})
export class AttestatiCard {
  private attestatoDetailModalService = inject(AttestatoDetailModalService);
  private auth = inject(AuthService);
  private edit = inject(EditModeService);
  private api = inject(AttestatiService);

  attestato = input.required<Attestato>();

  // segna questa card come LCP/priority dall'esterno (di default false)
  priority = input<boolean>(false);

  // rapporto predefinito nel primo paint, finché non conosciamo le dimensioni reali
  defaultAR = '16 / 9';

  // sarà impostato a "<naturalWidth> / <naturalHeight>" al load
  aspectRatio = signal<string | null>(null);

  isAuthenticated = computed(() => this.auth.isAuthenticated());
  isEditing = this.edit.isEditing;

  deleted = output<number>();

  onImgLoad(ev: Event) {
    const el = ev.target as HTMLImageElement;
    if (el?.naturalWidth && el?.naturalHeight) {
      this.aspectRatio.set(`${el.naturalWidth} / ${el.naturalHeight}`);
    }
  }

  onImgError(ev: Event) {
    console.warn('img error', ev);
  }

  /**
   * Gestisce il click sulla card aprendo il dialog di dettaglio
   */
  onCardClick(): void {
    this.attestatoDetailModalService.open(this.attestato());
  }

  onAdminButtonClick(event: MouseEvent): void {
    event.stopPropagation();
    const id = this.attestato().id as number;
    this.api.delete$(id).subscribe({
      next: () => {
        this.deleted.emit(id);
      },
      error: (err) => {
        console.error('Errore eliminazione attestato', err);
      }
    });
  }
}
