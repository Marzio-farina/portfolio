import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class EditModeService {
  private auth = inject(AuthService);
  private tenant = inject(TenantService);
  
  private _isEditingInternal = signal(false);
  
  constructor() {
    // Disabilita automaticamente l'edit mode quando l'utente non può più modificare
    effect(() => {
      const canModify = this.canEdit();
      const isCurrentlyEditing = this._isEditingInternal();
      
      // Se stava modificando ma ora non può più, disabilita
      if (isCurrentlyEditing && !canModify) {
        this._isEditingInternal.set(false);
        console.log('ℹ️ Edit mode disabilitato: sei su una pagina di un altro utente');
      }
    });
  }
  
  /**
   * Verifica se l'utente autenticato può modificare la pagina corrente
   * Un utente può modificare solo se:
   * 1. È autenticato
   * 2. Sta visualizzando la sua pagina personale (slug corrisponde)
   */
  readonly canEdit = computed(() => {
    const isAuthenticated = this.auth.isAuthenticated();
    if (!isAuthenticated) return false;
    
    const authenticatedUserId = this.auth.authenticatedUserId();
    const currentPageUserId = this.tenant.userId();
    
    // Se non c'è tenant (pagina senza slug), può modificare solo l'utente principale
    // Se c'è tenant, deve corrispondere all'utente autenticato
    return authenticatedUserId === currentPageUserId;
  });
  
  /**
   * Modalità di modifica effettiva: attiva SOLO se l'utente può modificare E ha abilitato l'editing
   */
  readonly isEditing = computed(() => {
    return this._isEditingInternal() && this.canEdit();
  });

  enable(): void { 
    if (this.canEdit()) {
      this._isEditingInternal.set(true);
    } else {
      console.warn('⚠️ Non puoi modificare questa pagina. Puoi modificare solo le tue pagine personali.');
    }
  }
  
  disable(): void { 
    this._isEditingInternal.set(false); 
  }
  
  toggle(): void { 
    if (this._isEditingInternal()) {
      this.disable();
    } else {
      this.enable();
    }
  }
}


