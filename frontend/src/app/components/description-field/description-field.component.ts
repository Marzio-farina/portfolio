import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-description-field',
  standalone: true,
  imports: [],
  templateUrl: './description-field.component.html',
  styleUrl: './description-field.component.css'
})
export class DescriptionFieldComponent {
  // Input: valore descrizione
  description = input<string>('');
  
  // Input: descrizione corrente (modalità view)
  currentDescription = input<string>('');
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Output: quando cambia la descrizione
  descriptionChanged = output<string>();
  
  /**
   * Gestisce il cambio descrizione
   */
  onDescriptionChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.descriptionChanged.emit(textarea.value);
  }
}

