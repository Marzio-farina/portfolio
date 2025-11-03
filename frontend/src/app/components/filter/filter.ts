import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-filter',
  imports: [],
  templateUrl: './filter.html',
  styleUrl: './filter.css'
})
export class Filter {
  // categorie uniche (incluso "Tutti")
  categories = input.required<string[]>();
  // categoria selezionata
  selected = input<string>('Tutti');
  // se l'utente può eliminare categorie (loggato + edit mode)
  canDelete = input<boolean>(false);
  // categorie in attesa di creazione/eliminazione (disabilitate)
  pendingCategories = input<Set<string>>(new Set());
  // evento verso il genitore
  select = output<string>();
  
  // evento per eliminare una categoria
  deleteCategory = output<string>();
  
  // evento per aggiungere una categoria (passa il titolo)
  addCategory = output<string>();

  // Traccia quale categoria ha la X visibile
  hoveredCategory = signal<string | null>(null);
  
  // Timer per il ritardo di scomparsa
  private hideTimer: any = null;
  
  // Stato button aggiungi categoria (expanded per mostrare input)
  isAddExpanded = signal<boolean>(false);
  
  // Valore temporaneo della nuova categoria
  newCategoryValue = signal<string>('');
  
  // Timer per ritorno automatico allo stato collapsed
  private collapseTimer: any = null;

  onSelect(c: string) {
    // Non permettere la selezione di categorie pending
    if (this.isPending(c)) {
      return;
    }
    this.select.emit(c);
  }

  /**
   * Verifica se una categoria è in stato pending
   */
  isPending(category: string): boolean {
    return this.pendingCategories().has(category);
  }

  /**
   * Mostra la X quando il mouse entra sul button
   */
  onMouseEnter(category: string): void {
    // Cancella eventuali timer precedenti
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    // Mostra la X
    this.hoveredCategory.set(category);
  }

  /**
   * Nasconde la X dopo 2secondi quando il mouse esce
   */
  onMouseLeave(): void {
    // Avvia un timer per nascondere la X dopo 2 secondi
    this.hideTimer = setTimeout(() => {
      this.hoveredCategory.set(null);
      this.hideTimer = null;
    }, 2000); // 2 secondi di ritardo
  }

  /**
   * Verifica se la X deve essere visibile per questa categoria
   */
  isRemoveVisible(category: string): boolean {
    return this.hoveredCategory() === category;
  }

  /**
   * Gestisce il click sulla X per eliminare la categoria
   */
  onDelete(event: MouseEvent, category: string): void {
    event.stopPropagation(); // Previeni il click sul button
    
    // Non permettere l'eliminazione di "Tutti"
    if (category === 'Tutti') {
      return;
    }
    
    // Cancella il timer se esiste
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    
    // Nascondi subito la X
    this.hoveredCategory.set(null);
    
    // Emetti evento di eliminazione
    this.deleteCategory.emit(category);
  }

  /**
   * Gestisce il click sul button + per aggiungere una categoria
   * Espande il button per mostrare un input field
   */
  onAddCategory(): void {
    if (this.isAddExpanded()) {
      // Se è già espanso, non fa niente (l'utente sta scrivendo)
      return;
    }
    
    // Espandi il button
    this.isAddExpanded.set(true);
    this.newCategoryValue.set('');
    
    // Cancella eventuali timer precedenti
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    
    // Avvia timer per collassare dopo 5 secondi di inattività
    this.startCollapseTimer();
    
    // Focus sull'input dopo l'espansione
    setTimeout(() => {
      const input = document.querySelector('.filter-add-input') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }
  
  /**
   * Avvia il timer per collassare automaticamente dopo 5 secondi
   */
  private startCollapseTimer(): void {
    this.collapseTimer = setTimeout(() => {
      this.collapseAddButton(true); // true = salva se c'è contenuto
    }, 5000);
  }
  
  /**
   * Cancella il timer e lo riavvia (chiamato quando l'utente scrive)
   */
  private resetCollapseTimer(): void {
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
    }
    this.startCollapseTimer();
  }
  
  /**
   * Collassa il button allo stato iniziale
   * Se saveIfNotEmpty è true e c'è del testo, salva la categoria prima di collassare
   */
  private collapseAddButton(saveIfNotEmpty: boolean = false): void {
    const trimmedValue = this.newCategoryValue().trim();
    
    // Se c'è del testo e saveIfNotEmpty è true, salva prima di collassare
    if (saveIfNotEmpty && trimmedValue !== '') {
      this.addCategory.emit(trimmedValue);
    }
    
    // Collassa il button
    this.isAddExpanded.set(false);
    this.newCategoryValue.set('');
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
  }
  
  /**
   * Gestisce l'input nel campo categoria
   */
  onCategoryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newCategoryValue.set(input.value);
    
    // Resetta il timer quando l'utente scrive
    this.resetCollapseTimer();
  }
  
  /**
   * Gestisce il blur dall'input (quando perde il focus)
   */
  onCategoryBlur(): void {
    // Riduci il timer a 500ms quando perde il focus
    // Salva se c'è contenuto
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
    }
    this.collapseTimer = setTimeout(() => {
      this.collapseAddButton(true); // true = salva se c'è contenuto
    }, 500);
  }
  
  /**
   * Gestisce l'invio della nuova categoria (Enter)
   */
  onCategorySubmit(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      
      const trimmedValue = this.newCategoryValue().trim();
      
      if (trimmedValue === '') {
        this.collapseAddButton();
        return;
      }
      
      // Emetti l'evento con il valore della nuova categoria
      this.addCategory.emit(trimmedValue);
      
      // Collassa il button
      this.collapseAddButton();
    } else if (event.key === 'Escape') {
      // Annulla con Esc
      this.collapseAddButton();
    }
  }
}