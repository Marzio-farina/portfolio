import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe per evidenziare parole chiave nel testo
 * Wrappa le parole chiave in <span> con classi CSS
 */
@Pipe({
  name: 'highlightKeywords',
  standalone: true
})
export class HighlightKeywordsPipe implements PipeTransform {
  
  /**
   * Parole chiave da evidenziare (case-insensitive)
   * Ordinate per importanza e lunghezza
   */
  private readonly keywords = [
    // Frasi motivazionali (più lunghe prima)
    'Non mollare mai',
    'voglia di migliorarmi',
    'precisione tecnica e creatività',
    
    // Competenze (frasi complete)
    'Full Stack Developer',
    'sviluppatore di applicazioni desktop',
    'attitudine analitica',
    
    // Tecnologie
    'Laravel',
    'Angular',
    '.NET',
    'Electron',
    
    // Tipi di applicazioni e soluzioni
    'applicazioni web e desktop',
    'applicazioni web',
    'applicazioni desktop',
    'soluzioni software',
    'gestionali dedicati',
    
    // Qualità del software
    'scalabili',
    'affidabili',
    'funzionali',
    'performante',
    'intuitivi',
    'piacevoli da utilizzare',
    'stabile',
    
    // Concetti chiave
    'automazione',
    'metodologia di lavoro',
    'precisione tecnica',
    'creatività',
    'esperienza d\'uso',
    'produttività',
    
    // Approccio
    'orientata ai risultati',
    'solidità del codice',
    'progetti complessi',
    'valore reale',
    
    // Singole parole importanti
    'Full Stack',
    'desktop',
  ];

  transform(text: string): string {
    if (!text) return '';

    let result = text;
    
    // Usa marker temporanei per evitare annidamenti
    const MARKER_START = '⟪KW⟫';
    const MARKER_END = '⟪/KW⟫';
    
    // Ordina le keywords per lunghezza (più lunghe prima per evitare sostituzioni parziali)
    const sortedKeywords = [...this.keywords].sort((a, b) => b.length - a.length);
    
    // Primo passo: sostituisci con marker temporanei, ma SOLO se non già dentro un marker
    sortedKeywords.forEach(keyword => {
      const parts: string[] = [];
      let remaining = result;
      
      // Split usando i marker per processare solo le parti non marcate
      while (remaining.length > 0) {
        const startIdx = remaining.indexOf(MARKER_START);
        
        if (startIdx === -1) {
          // Nessun marker trovato, processa tutto il testo rimanente
          const regex = new RegExp(`(${this.escapeRegex(keyword)})`, 'gi');
          parts.push(remaining.replace(regex, `${MARKER_START}$1${MARKER_END}`));
          break;
        }
        
        // Processa il testo PRIMA del marker
        const beforeMarker = remaining.substring(0, startIdx);
        const regex = new RegExp(`(${this.escapeRegex(keyword)})`, 'gi');
        parts.push(beforeMarker.replace(regex, `${MARKER_START}$1${MARKER_END}`));
        
        // Trova la fine del marker
        const endIdx = remaining.indexOf(MARKER_END, startIdx);
        if (endIdx === -1) break;
        
        // Aggiungi il marker esistente senza modificarlo
        parts.push(remaining.substring(startIdx, endIdx + MARKER_END.length));
        
        // Continua con il resto
        remaining = remaining.substring(endIdx + MARKER_END.length);
      }
      
      result = parts.join('');
    });
    
    // Secondo passo: converti tutti i marker in span HTML
    // Usa una regex che cattura tutto tra i marker (inclusi eventuali marker annidati)
    while (result.includes(MARKER_START)) {
      result = result.replace(
        new RegExp(`${this.escapeRegex(MARKER_START)}(.*?)${this.escapeRegex(MARKER_END)}`, 's'),
        '<span class="keyword">$1</span>'
      );
    }
    
    return result;
  }

  /**
   * Escape caratteri speciali regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
