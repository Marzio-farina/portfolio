import { Component, input, output } from '@angular/core';

export interface Category {
  id: number;
  title: string;
}

@Component({
  selector: 'app-category-field',
  standalone: true,
  imports: [],
  templateUrl: './category-field.component.html',
  styleUrl: './category-field.component.css'
})
export class CategoryFieldComponent {
  // Input: valore categoria selezionata
  selectedCategoryId = input<number | string>('');
  
  // Input: categorie disponibili
  categories = input<Category[]>([]);
  
  // Input: categoria corrente (modalità view)
  currentCategory = input<string>('');
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Input: loading state
  loading = input<boolean>(false);
  
  // Output: quando cambia la selezione
  categoryChanged = output<number | string>();
  
  /**
   * Gestisce il cambio categoria
   */
  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.categoryChanged.emit(select.value);
  }
}

