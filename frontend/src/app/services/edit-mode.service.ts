import { Injectable, signal, computed, inject, effect, Injector } from '@angular/core';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class EditModeService {
  private tenant = inject(TenantService);
  private injector = inject(Injector);
  
  private _isEditingInternal = signal(false);
  
  // Signal per l'ID utente autenticato (sincronizzato con localStorage)
  private authenticatedUserId = signal<number | null>(null);
  
  // Signal per il token (aggiornato da AuthService per evitare dipendenza circolare)
  private _token = signal<string | null>(null);
  
  constructor() {
    // Inizializza il token dal localStorage per evitare che canEdit() ritorni false inizialmente
    if (typeof window !== 'undefined') {
      const currentSlug = this.tenant.userSlug();
      const tokenKey = currentSlug ? `auth_token_${currentSlug}` : 'auth_token_main';
      const token = localStorage.getItem(tokenKey);
      this._token.set(token);
    }
    
    // Disabilita automaticamente l'edit mode quando l'utente non può più modificare
    effect(() => {
      const canModify = this.canEdit();
      const isCurrentlyEditing = this._isEditingInternal();
      
      // Se stava modificando ma ora non può più, disabilita
      if (isCurrentlyEditing && !canModify) {
        this._isEditingInternal.set(false);
      }
    });
  }
  
  /**
   * Metodo pubblico per aggiornare l'ID utente autenticato (chiamato da AuthService)
   */
  setAuthenticatedUserId(userId: number | null): void {
    this.authenticatedUserId.set(userId);
  }
  
  /**
   * Metodo pubblico per aggiornare il token (chiamato da AuthService per evitare dipendenza circolare)
   */
  setToken(token: string | null): void {
    this._token.set(token);
  }
  
  /**
   * Verifica se l'utente autenticato può modificare la pagina corrente
   * Un utente può modificare solo se:
   * 1. È autenticato (ha un token per lo slug corrente)
   * 2. Sta visualizzando la sua pagina personale (userId corrisponde al tenant)
   */
  readonly canEdit = computed(() => {
    if (typeof window === 'undefined') return false;
    
    // Ottieni lo slug corrente dalla pagina (questo rende il computed reattivo ai cambiamenti del tenant)
    const currentSlug = this.tenant.userSlug();
    
    // Usa il token signal locale (aggiornato da AuthService per evitare dipendenza circolare)
    const token = this._token();
    
    if (!token) {
      return false;
    }
    
    // Legge i valori dai signal per renderli reattivi
    const authUserId = this.authenticatedUserId();
    const currentPageUserId = this.tenant.userId();
    
    // Se non abbiamo l'ID utente autenticato, non può modificare
    // Questo può accadere se loadAuthenticatedUserId() non è ancora completato
    if (!authUserId) {
      return false;
    }
    
    // Se non c'è tenant (pagina senza slug), l'utente può modificare solo se è l'utente principale (id=1)
    // Se c'è tenant, deve corrispondere all'utente autenticato
    if (!currentPageUserId) {
      // Pagina senza slug: solo l'utente principale può modificare
      return authUserId === 1;
    }
    
    // Pagina con slug: l'utente autenticato deve corrispondere al tenant
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


