import { Component, input, output} from '@angular/core';

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
  // evento verso il genitore
  select = output<string>();

  onSelect(c: string) {
    this.select.emit(c);
  }
}