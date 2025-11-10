import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class EditModeService {
  private tenant = inject(TenantService);
  
  private _isEditingInternal = signal(false);
  
  // Signal per l'ID utente autenticato (sincronizzato con localStorage)
  private authenticatedUserId = signal<number | null>(null);
  
  constructor() {
    // Leggi l'ID utente autenticato all'avvio
    this.syncAuthenticatedUserId();
    
    // Monitora i cambiamenti nel localStorage (quando si fa login/logout)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => {
        this.syncAuthenticatedUserId();
      });
    }
    
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
   * Sincronizza l'ID utente autenticato dal token nel localStorage
   */
  private syncAuthenticatedUserId(): void {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    // Per ora, assumiamo che se c'è un token l'utente è autenticato
    // L'ID viene gestito da AuthService e possiamo accedervi tramite signal condivisi
    if (token) {
      // L'ID viene impostato da AuthService dopo il login
      // Per ora, manteniamo lo stato corrente
    } else {
      this.authenticatedUserId.set(null);
    }
  }
  
  /**
   * Metodo pubblico per aggiornare l'ID utente autenticato (chiamato da AuthService)
   */
  setAuthenticatedUserId(userId: number | null): void {
    this.authenticatedUserId.set(userId);
  }
  
  /**
   * Verifica se l'utente autenticato può modificare la pagina corrente
   * Un utente può modificare solo se:
   * 1. È autenticato (ha un token)
   * 2. Sta visualizzando la sua pagina personale (userId corrisponde al tenant)
   */
  readonly canEdit = computed(() => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');
    if (!hasToken) return false;
    
    const authUserId = this.authenticatedUserId();
    const currentPageUserId = this.tenant.userId();
    
    // Se non abbiamo l'ID utente autenticato, non può modificare
    if (!authUserId) return false;
    
    // Se non c'è tenant (pagina senza slug), l'utente può modificare solo se è l'utente principale (id=1)
    // Se c'è tenant, deve corrispondere all'utente autenticato
    if (!currentPageUserId) {
      // Pagina senza slug: solo l'utente principale può modificare
      return authUserId === 1;
    }
    
    return authUserId === currentPageUserId;
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


