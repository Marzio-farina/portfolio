import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-description-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './description-field.component.html',
  styleUrl: './description-field.component.css'
})
export class DescriptionFieldComponent {
  // Input: controllo form
  formControl = input.required<FormControl>();
  
  // Input: descrizione corrente (modalità view)
  currentDescription = input<string>('');
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
}

