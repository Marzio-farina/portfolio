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
  // evento verso il genitore
  select = output<string>();
  
  // evento per eliminare una categoria
  deleteCategory = output<string>();

  // Traccia quale categoria ha la X visibile
  hoveredCategory = signal<string | null>(null);
  
  // Timer per il ritardo di scomparsa
  private hideTimer: any = null;

  onSelect(c: string) {
    this.select.emit(c);
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
}