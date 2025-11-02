import { Component, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface Category {
  id: number;
  title: string;
}

@Component({
  selector: 'app-category-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './category-field.component.html',
  styleUrl: './category-field.component.css'
})
export class CategoryFieldComponent {
  // Input: controllo form
  formControl = input.required<FormControl>();
  
  // Input: categorie disponibili
  categories = input<Category[]>([]);
  
  // Input: categoria corrente (modalità view)
  currentCategory = input<string>('');
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Input: loading state
  loading = input<boolean>(false);
}

