import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-custom-text-element',
  standalone: true,
  imports: [],
  templateUrl: './custom-text-element.component.html',
  styleUrl: './custom-text-element.component.css'
})
export class CustomTextElementComponent {
  // Input: ID elemento (per generare id univoco)
  elementId = input<string>('custom-text');
  
  // Input: contenuto testo
  content = input<string>('');
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Input: stato saving
  saving = input<boolean>(false);
  
  // Output: quando il contenuto cambia
  contentChanged = output<string>();
  
  /**
   * Gestisce il cambio contenuto
   */
  onContentChange(value: string): void {
    this.contentChanged.emit(value);
  }
}

