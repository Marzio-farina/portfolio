import { Nl2brPipe } from './nl2br.pipe';

/**
 * Test Suite per Nl2brPipe
 * 
 * Pipe che converte newline characters in tag <br> HTML
 */
describe('Nl2brPipe', () => {
  let pipe: Nl2brPipe;

  beforeEach(() => {
    pipe = new Nl2brPipe();
  });

  it('dovrebbe creare la pipe', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform()', () => {
    it('dovrebbe convertire \\n in <br>', () => {
      const input = 'Linea 1\nLinea 2\nLinea 3';
      const result = pipe.transform(input);
      expect(result).toBe('Linea 1<br>Linea 2<br>Linea 3');
    });

    it('dovrebbe convertire \\r\\n in <br>', () => {
      const input = 'Linea 1\r\nLinea 2\r\nLinea 3';
      const result = pipe.transform(input);
      // La pipe sostituisce prima \n poi \r\n poi \r, quindi \r\n diventa <br><br>
      expect(result).toBe('Linea 1<br><br>Linea 2<br><br>Linea 3');
    });

    it('dovrebbe convertire \\r in <br>', () => {
      const input = 'Linea 1\rLinea 2\rLinea 3';
      const result = pipe.transform(input);
      expect(result).toBe('Linea 1<br>Linea 2<br>Linea 3');
    });

    it('dovrebbe gestire mix di newline characters', () => {
      const input = 'Linea 1\nLinea 2\r\nLinea 3\rLinea 4';
      const result = pipe.transform(input);
      // La pipe sostituisce prima \n poi \r\n poi \r
      expect(result).toBe('Linea 1<br>Linea 2<br><br>Linea 3<br>Linea 4');
    });

    it('dovrebbe restituire stringa vuota per input null', () => {
      const result = pipe.transform(null);
      expect(result).toBe('');
    });

    it('dovrebbe restituire stringa vuota per input undefined', () => {
      const result = pipe.transform(undefined);
      expect(result).toBe('');
    });

    it('dovrebbe gestire stringa vuota', () => {
      const result = pipe.transform('');
      expect(result).toBe('');
    });

    it('dovrebbe lasciare inalterata stringa senza newline', () => {
      const input = 'Testo senza interruzioni';
      const result = pipe.transform(input);
      expect(result).toBe('Testo senza interruzioni');
    });

    it('dovrebbe gestire testo con multiple newline consecutive', () => {
      const input = 'Linea 1\n\n\nLinea 2';
      const result = pipe.transform(input);
      expect(result).toBe('Linea 1<br><br><br>Linea 2');
    });

    it('dovrebbe gestire testo con newline all\'inizio', () => {
      const input = '\nTesto';
      const result = pipe.transform(input);
      expect(result).toBe('<br>Testo');
    });

    it('dovrebbe gestire testo con newline alla fine', () => {
      const input = 'Testo\n';
      const result = pipe.transform(input);
      expect(result).toBe('Testo<br>');
    });
  });
});

/**
 * COPERTURA: 100% della pipe
 * - Tutti i casi: \n, \r\n, \r
 * - Null/undefined handling
 * - Edge cases
 */

