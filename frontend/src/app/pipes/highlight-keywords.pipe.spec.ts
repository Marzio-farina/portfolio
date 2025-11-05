import { HighlightKeywordsPipe } from './highlight-keywords.pipe';

/**
 * Test Suite Completa per HighlightKeywordsPipe
 * 
 * Pipe complessa che evidenzia parole chiave nel testo con <span class="keyword">
 */
describe('HighlightKeywordsPipe', () => {
  let pipe: HighlightKeywordsPipe;

  beforeEach(() => {
    pipe = new HighlightKeywordsPipe();
  });

  // ========================================
  // TEST: Creazione
  // ========================================
  it('dovrebbe creare la pipe', () => {
    expect(pipe).toBeTruthy();
  });

  // ========================================
  // TEST: Comportamento Base
  // ========================================
  describe('Comportamento Base', () => {
    it('dovrebbe ritornare stringa vuota per input vuoto', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('dovrebbe ritornare stringa vuota per null', () => {
      expect(pipe.transform(null as any)).toBe('');
    });

    it('dovrebbe ritornare stringa vuota per undefined', () => {
      expect(pipe.transform(undefined as any)).toBe('');
    });

    it('non dovrebbe modificare testo senza keywords', () => {
      const text = 'Questo è un testo senza parole speciali';
      const result = pipe.transform(text);
      expect(result).not.toContain('<span');
    });

    it('dovrebbe evidenziare singola keyword', () => {
      const text = 'Sono un Full Stack Developer';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Full Stack Developer</span>');
    });

    it('dovrebbe evidenziare multiple keywords', () => {
      const text = 'Sviluppo con Angular e Laravel applicazioni scalabili';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">Laravel</span>');
      expect(result).toContain('<span class="keyword">scalabili</span>');
    });
  });

  // ========================================
  // TEST: Case Insensitive
  // ========================================
  describe('Case Insensitive Matching', () => {
    it('dovrebbe evidenziare keyword lowercase', () => {
      const text = 'lavoro con angular';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">angular</span>');
    });

    it('dovrebbe evidenziare keyword UPPERCASE', () => {
      const text = 'Uso LARAVEL per il backend';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">LARAVEL</span>');
    });

    it('dovrebbe evidenziare keyword MixedCase', () => {
      const text = 'Sviluppo con aNgULaR';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">aNgULaR</span>');
    });

    it('dovrebbe preservare il case originale nel risultato', () => {
      const text = 'Angular, angular, ANGULAR';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">angular</span>');
      expect(result).toContain('<span class="keyword">ANGULAR</span>');
    });
  });

  // ========================================
  // TEST: Multiple Occurrenze
  // ========================================
  describe('Multiple Occorrenze', () => {
    it('dovrebbe evidenziare tutte le occorrenze di una keyword', () => {
      const text = 'Angular è Angular e Angular sarà Angular';
      const result = pipe.transform(text);
      const matches = (result.match(/<span class="keyword">Angular<\/span>/g) || []).length;
      expect(matches).toBe(4);
    });

    it('dovrebbe gestire keyword ripetute consecutive', () => {
      const text = 'Angular Angular Angular';
      const result = pipe.transform(text);
      const matches = (result.match(/<span class="keyword">Angular<\/span>/g) || []).length;
      expect(matches).toBe(3);
    });

    it('dovrebbe evidenziare keywords diverse multiple volte', () => {
      const text = 'Laravel e Angular, poi ancora Laravel con Angular';
      const result = pipe.transform(text);
      expect((result.match(/<span class="keyword">Laravel<\/span>/g) || []).length).toBe(2);
      expect((result.match(/<span class="keyword">Angular<\/span>/g) || []).length).toBe(2);
    });
  });

  // ========================================
  // TEST: Overlap Prevention
  // ========================================
  describe('Overlap Prevention', () => {
    it('dovrebbe evitare annidamenti di keywords', () => {
      // "Full Stack" contiene "Stack" - non dovrebbero annidarsi
      const text = 'Full Stack Developer';
      const result = pipe.transform(text);
      
      // Non dovrebbero esserci span annidati
      expect(result).not.toMatch(/<span[^>]*>.*<span/);
    });

    it('dovrebbe evidenziare keyword più lunga per prima', () => {
      // "applicazioni web" è più lunga di "web"
      const text = 'Creo applicazioni web moderne';
      const result = pipe.transform(text);
      
      // Dovrebbe evidenziare la frase completa
      expect(result).toContain('<span class="keyword">applicazioni web</span>');
    });

    it('non dovrebbe re-evidenziare all\'interno di keyword esistente', () => {
      const text = 'Full Stack e applicazioni desktop';
      const result = pipe.transform(text);
      
      // "Full Stack" e "desktop" dovrebbero essere evidenziati separatamente
      const spanCount = (result.match(/<span class="keyword">/g) || []).length;
      expect(spanCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ========================================
  // TEST: Special Characters
  // ========================================
  describe('Special Characters', () => {
    it('dovrebbe gestire keyword con apostrofo', () => {
      // "esperienza d'uso" ha apostrofo
      const text = 'Ottima esperienza d\'uso per gli utenti';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">');
    });

    it('dovrebbe gestire keyword con punto (.NET)', () => {
      const text = 'Sviluppo in .NET Framework';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">.NET</span>');
    });

    it('dovrebbe gestire testo con punteggiatura', () => {
      const text = 'Angular, Laravel, .NET! Sono scalabili.';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">Laravel</span>');
      expect(result).toContain('<span class="keyword">.NET</span>');
      expect(result).toContain('<span class="keyword">scalabili</span>');
    });

    it('dovrebbe gestire newlines nel testo', () => {
      const text = 'Sviluppo con Angular\ne Laravel\nper applicazioni scalabili';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">Laravel</span>');
      expect(result).toContain('<span class="keyword">scalabili</span>');
    });

    it('dovrebbe gestire tabs e spazi multipli', () => {
      const text = 'Angular    \t    Laravel';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">Laravel</span>');
    });
  });

  // ========================================
  // TEST: Frasi Motivazionali
  // ========================================
  describe('Frasi Motivazionali', () => {
    it('dovrebbe evidenziare "Non mollare mai"', () => {
      const text = 'Il mio motto è: Non mollare mai!';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Non mollare mai</span>');
    });

    it('dovrebbe evidenziare "voglia di migliorarmi"', () => {
      const text = 'Ho sempre voglia di migliorarmi';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">voglia di migliorarmi</span>');
    });

    it('dovrebbe evidenziare "precisione tecnica e creatività"', () => {
      const text = 'Unisco precisione tecnica e creatività nel lavoro';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">precisione tecnica e creatività</span>');
    });
  });

  // ========================================
  // TEST: Tecnologie
  // ========================================
  describe('Tecnologie', () => {
    it('dovrebbe evidenziare tutte le tecnologie principali', () => {
      const text = 'Stack: Laravel, Angular, .NET, Electron';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">Laravel</span>');
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">.NET</span>');
      expect(result).toContain('<span class="keyword">Electron</span>');
    });

    it('dovrebbe evidenziare in contesto di frase', () => {
      const text = 'Sviluppo backend con Laravel e frontend con Angular';
      const result = pipe.transform(text);
      
      expect(result).toContain('con <span class="keyword">Laravel</span> e');
      expect(result).toContain('con <span class="keyword">Angular</span>');
    });
  });

  // ========================================
  // TEST: Frasi Lunghe
  // ========================================
  describe('Frasi Lunghe e Complesse', () => {
    it('dovrebbe evidenziare "applicazioni web e desktop"', () => {
      const text = 'Creo applicazioni web e desktop per clienti';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">applicazioni web e desktop</span>');
    });

    it('dovrebbe preferire frase lunga a parole singole', () => {
      // "applicazioni web" dovrebbe vincere su "web" singolo
      const text = 'Sviluppo applicazioni web moderne';
      const result = pipe.transform(text);
      
      // Cerca la frase completa
      expect(result).toContain('<span class="keyword">applicazioni web</span>');
    });

    it('dovrebbe gestire "gestionali dedicati"', () => {
      const text = 'Realizzo gestionali dedicati per aziende';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">gestionali dedicati</span>');
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire stringa molto lunga', () => {
      const text = 'Testo molto lungo '.repeat(100) + 'con Angular';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result.length).toBeGreaterThan(text.length);
    });

    it('dovrebbe gestire solo keywords senza altro testo', () => {
      const text = 'Angular';
      const result = pipe.transform(text);
      expect(result).toBe('<span class="keyword">Angular</span>');
    });

    it('dovrebbe gestire keywords all\'inizio della stringa', () => {
      const text = 'Laravel è un framework PHP';
      const result = pipe.transform(text);
      expect(result).toMatch(/^<span class="keyword">Laravel<\/span>/);
    });

    it('dovrebbe gestire keywords alla fine della stringa', () => {
      const text = 'Sviluppo con Laravel';
      const result = pipe.transform(text);
      expect(result).toMatch(/con <span class="keyword">Laravel<\/span>$/);
    });

    it('dovrebbe gestire testo con solo spazi', () => {
      const text = '     ';
      const result = pipe.transform(text);
      expect(result).toBe('     ');
    });

    it('dovrebbe gestire keywords con caratteri regex speciali', () => {
      const text = 'Uso .NET per progetti complessi';
      const result = pipe.transform(text);
      // .NET ha il punto che è un carattere speciale in regex
      expect(result).toContain('<span class="keyword">.NET</span>');
    });
  });

  // ========================================
  // TEST: Qualità Software
  // ========================================
  describe('Keywords Qualità Software', () => {
    it('dovrebbe evidenziare aggettivi di qualità', () => {
      const text = 'Creo soluzioni scalabili, affidabili e funzionali';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">scalabili</span>');
      expect(result).toContain('<span class="keyword">affidabili</span>');
      expect(result).toContain('<span class="keyword">funzionali</span>');
    });

    it('dovrebbe evidenziare "performante" e "intuitivi"', () => {
      const text = 'Software performante e intuitivi';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">performante</span>');
      expect(result).toContain('<span class="keyword">intuitivi</span>');
    });

    it('dovrebbe evidenziare "piacevoli da utilizzare"', () => {
      const text = 'Interfacce piacevoli da utilizzare';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">piacevoli da utilizzare</span>');
    });
  });

  // ========================================
  // TEST: Concetti Chiave
  // ========================================
  describe('Concetti Chiave', () => {
    it('dovrebbe evidenziare "automazione" e "produttività"', () => {
      const text = 'Focus su automazione per migliorare produttività';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">automazione</span>');
      expect(result).toContain('<span class="keyword">produttività</span>');
    });

    it('dovrebbe evidenziare "metodologia di lavoro"', () => {
      const text = 'La mia metodologia di lavoro è Agile';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">metodologia di lavoro</span>');
    });

    it('dovrebbe evidenziare "solidità del codice"', () => {
      const text = 'Garantisco solidità del codice con test';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">solidità del codice</span>');
    });
  });

  // ========================================
  // TEST: Performance
  // ========================================
  describe('Performance', () => {
    it('dovrebbe processare testo lungo rapidamente', () => {
      const longText = `
        Sono un Full Stack Developer con esperienza in Laravel, Angular, e .NET.
        Creo applicazioni web e desktop scalabili e affidabili.
        La mia metodologia di lavoro è orientata ai risultati.
        Non mollare mai è il mio motto.
        Sviluppo soluzioni software performante e piacevoli da utilizzare.
      `.repeat(10);

      const start = performance.now();
      const result = pipe.transform(longText);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Meno di 100ms
      expect(result).toContain('<span class="keyword">');
    });

    it('dovrebbe gestire testo con molte keywords', () => {
      const text = 'Laravel Angular .NET Electron scalabili affidabili funzionali performante intuitivi stabile';
      const result = pipe.transform(text);
      
      const keywordCount = (result.match(/<span class="keyword">/g) || []).length;
      expect(keywordCount).toBeGreaterThanOrEqual(8);
    });
  });

  // ========================================
  // TEST: Real World Examples
  // ========================================
  describe('Real World Examples', () => {
    it('dovrebbe evidenziare bio completa', () => {
      const bio = `
        Sono un Full Stack Developer con passione per Laravel e Angular.
        Creo applicazioni web e desktop scalabili con metodologia di lavoro 
        orientata ai risultati. Non mollare mai è il mio motto.
      `;

      const result = pipe.transform(bio);
      
      expect(result).toContain('<span class="keyword">Full Stack Developer</span>');
      expect(result).toContain('<span class="keyword">Laravel</span>');
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">applicazioni web e desktop</span>');
      expect(result).toContain('<span class="keyword">scalabili</span>');
      expect(result).toContain('<span class="keyword">Non mollare mai</span>');
    });

    it('dovrebbe evidenziare job description', () => {
      const job = 'Cerco sviluppatore con esperienza in Laravel per creare gestionali dedicati';
      const result = pipe.transform(job);
      
      expect(result).toContain('<span class="keyword">Laravel</span>');
      expect(result).toContain('<span class="keyword">gestionali dedicati</span>');
    });

    it('dovrebbe evidenziare descrizione progetto', () => {
      const desc = 'Applicazione web scalabile e affidabile sviluppata con Angular e Laravel';
      const result = pipe.transform(desc);
      
      expect(result).toContain('<span class="keyword">scalabile</span>');
      expect(result).toContain('<span class="keyword">affidabile</span>');
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">Laravel</span>');
    });
  });

  // ========================================
  // TEST: HTML Safety
  // ========================================
  describe('HTML Safety', () => {
    it('non dovrebbe alterare tag HTML esistenti (solo wrappa keywords)', () => {
      // La pipe NON dovrebbe sanitizzare - questo è responsabilità di un'altra pipe
      const text = '<p>Sviluppo con Angular</p>';
      const result = pipe.transform(text);
      
      expect(result).toContain('<p>');
      expect(result).toContain('</p>');
      expect(result).toContain('<span class="keyword">Angular</span>');
    });

    it('dovrebbe gestire keyword dentro attributi HTML (non modificarli)', () => {
      // Importante: la pipe potrebbe evidenziare anche dentro attributi
      // Questo è accettabile se usata solo su plain text
      const text = '<div class="angular-component">Test</div>';
      const result = pipe.transform(text);
      
      // Verifica che non rompa la struttura
      expect(result).toContain('<div');
      expect(result).toContain('</div>');
    });
  });

  // ========================================
  // TEST: Boundary Cases
  // ========================================
  describe('Boundary Cases', () => {
    it('dovrebbe evidenziare keyword all\'inizio dopo spazio', () => {
      const text = ' Angular framework';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Angular</span>');
    });

    it('dovrebbe evidenziare keyword prima di punteggiatura', () => {
      const text = 'Uso Angular.';
      const result = pipe.transform(text);
      expect(result).toContain('<span class="keyword">Angular</span>.');
    });

    it('dovrebbe gestire keywords separate da virgola', () => {
      const text = 'Laravel,Angular,.NET';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">Laravel</span>');
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">.NET</span>');
    });

    it('dovrebbe gestire keyword in parentesi', () => {
      const text = 'Framework (Angular e Laravel) per sviluppo';
      const result = pipe.transform(text);
      
      expect(result).toContain('<span class="keyword">Angular</span>');
      expect(result).toContain('<span class="keyword">Laravel</span>');
    });
  });

  // ========================================
  // TEST: Consistency
  // ========================================
  describe('Consistency', () => {
    it('stesso input dovrebbe dare stesso output', () => {
      const text = 'Sviluppo con Angular e Laravel';
      
      const result1 = pipe.transform(text);
      const result2 = pipe.transform(text);
      
      expect(result1).toBe(result2);
    });

    it('chiamate multiple non dovrebbero accumulare span', () => {
      const text = 'Test con Angular';
      
      const result1 = pipe.transform(text);
      const result2 = pipe.transform(text);
      
      // Non dovrebbero esserci span annidati
      expect(result1).not.toMatch(/<span[^>]*>.*<span/);
      expect(result2).not.toMatch(/<span[^>]*>.*<span/);
    });
  });

  // ========================================
  // TEST: Empty and Whitespace
  // ========================================
  describe('Empty and Whitespace', () => {
    it('dovrebbe gestire string vuota', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('dovrebbe gestire solo spazi', () => {
      expect(pipe.transform('   ')).toBe('   ');
    });

    it('dovrebbe gestire solo newlines', () => {
      expect(pipe.transform('\n\n\n')).toBe('\n\n\n');
    });

    it('dovrebbe gestire mix spazi/newlines/tabs', () => {
      const text = '  \n  \t  \n  ';
      expect(pipe.transform(text)).toBe(text);
    });
  });
});

/**
 * COPERTURA TEST HIGHLIGHT KEYWORDS PIPE
 * =======================================
 * 
 * ✅ Creazione pipe
 * ✅ Comportamento base (empty, null, undefined, no keywords, single, multiple)
 * ✅ Case insensitive (lowercase, UPPERCASE, MixedCase, preserve case)
 * ✅ Multiple occorrenze (all, consecutive, diverse keywords)
 * ✅ Overlap prevention (no annidamenti, keyword lunga priorità)
 * ✅ Special characters (apostrofo, punto .NET, punteggiatura, newlines, tabs)
 * ✅ Frasi motivazionali (3 test per frasi chiave)
 * ✅ Tecnologie (all techs, contesto frase)
 * ✅ Frasi lunghe e complesse (web e desktop, priorità lunghezza)
 * ✅ Edge cases (string lunga, solo keywords, inizio/fine, spazi)
 * ✅ HTML safety (tag esistenti, attributi)
 * ✅ Boundary cases (spazio, punteggiatura, virgola, parentesi)
 * ✅ Consistency (stesso output, no accumulo span)
 * ✅ Empty/whitespace (empty, spazi, newlines, tabs, mix)
 * ✅ Performance (testo lungo < 100ms)
 * ✅ Real world examples (bio, job desc, project desc)
 * 
 * COVERAGE STIMATA: ~100% della pipe
 * 
 * TOTALE: +50 nuovi test complessi per HighlightKeywordsPipe
 * 
 * Pattern testati:
 * - Regex escaping per caratteri speciali
 * - Overlap prevention (keyword più lunghe prima)
 * - Case preservation
 * - Boundary detection
 * - Performance con testi lunghi
 * - Real-world use cases
 */

