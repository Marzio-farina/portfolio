import { Component, inject, input, signal, computed, output, DestroyRef } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Attestato } from '../../models/attestato.model';
import { AttestatoDetailModalService } from '../../services/attestato-detail-modal.service';
import { AuthService } from '../../services/auth.service';
import { EditModeService } from '../../services/edit-mode.service';
import { AttestatiService } from '../../services/attestati.service';
import { DeletionConfirmationService } from '../../services/deletion-confirmation.service';
import { AdminDeleteButton } from '../shared/admin-delete-button/admin-delete-button';
import { DeletionOverlay } from '../shared/deletion-overlay/deletion-overlay';

@Component({
  selector: 'app-attestati-card',
  standalone: true,
  imports: [NgOptimizedImage, AdminDeleteButton, DeletionOverlay],
  providers: [DeletionConfirmationService],
  templateUrl: './attestati-card.html',
  styleUrls: ['./attestati-card.css'],
})
export class AttestatiCard {
  private attestatoDetailModalService = inject(AttestatoDetailModalService);
  private auth = inject(AuthService);
  private edit = inject(EditModeService);
  private api = inject(AttestatiService);
  private destroyRef = inject(DestroyRef);
  
  // Service per gestione cancellazione con conferma
  deletionService = inject(DeletionConfirmationService);

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
  deletedError = output<{ id: number; error: any }>();
  attestatoChanged = output<Attestato>();
  
  // Espone lo stato deleting del service
  deleting = computed(() => this.deletionService.isDeleting());

  constructor() {
    // Inizializza il service
    this.deletionService.initialize(this.destroyRef);
  }

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
    // Previeni apertura durante cancellazione
    if (this.deleting()) {
      return;
    }
    this.attestatoDetailModalService.open(this.attestato());
  }

  /**
   * Gestisce il click sul bottone admin (X o ↩)
   */
  onAdminButtonClick(event: Event): void {
    event.stopPropagation();
    const id = this.attestato().id as number;

    // Usa il service per gestire la logica di conferma
    this.deletionService.handleAdminClick(
      id,
      this.api.delete$(id),
      null, // Gli attestati non hanno restore API (implementare se necessario)
      (deletedId) => this.deleted.emit(deletedId),
      (error) => {
        console.error('Errore eliminazione attestato', error);
        this.deletedError.emit({ id, error });
      }
    );
  }
}
