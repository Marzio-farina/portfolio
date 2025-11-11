import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe per convertire la sintassi [[keyword]] in HTML <span class="keyword">
 * Questa pipe sostituisce highlightKeywords per la bio, permettendo all'utente
 * di definire le proprie parole chiave invece di usare una lista predefinita
 */
@Pipe({
  name: 'parseBioKeywords',
  standalone: true
})
export class ParseBioKeywordsPipe implements PipeTransform {
  
  transform(text: string): string {
    if (!text) return '';
    
    // Converte [[keyword]] in <span class="keyword">keyword</span>
    return text.replace(/\[\[(.*?)\]\]/g, '<span class="keyword">$1</span>');
  }
}

