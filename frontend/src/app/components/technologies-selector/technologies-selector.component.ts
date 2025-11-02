import { Component, input, output } from '@angular/core';

export interface Technology {
  id: number;
  title: string;
}

@Component({
  selector: 'app-technologies-selector',
  standalone: true,
  imports: [],
  templateUrl: './technologies-selector.component.html',
  styleUrl: './technologies-selector.component.css'
})
export class TechnologiesSelectorComponent {
  // Input: tecnologie disponibili
  availableTechnologies = input<Technology[]>([]);
  
  // Input: ID tecnologie selezionate
  selectedTechnologyIds = input<number[]>([]);
  
  // Input: tecnologie del progetto (modalità view)
  projectTechnologies = input<Technology[]>([]);
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Input: loading state
  loading = input<boolean>(false);
  
  // Output: quando viene toggleata una tecnologia
  technologyToggled = output<number>();
  
  /**
   * Verifica se una tecnologia è selezionata
   */
  isTechnologySelected(techId: number): boolean {
    return this.selectedTechnologyIds().includes(techId);
  }
  
  /**
   * Toggle tecnologia
   */
  toggleTechnology(techId: number): void {
    this.technologyToggled.emit(techId);
  }
}

