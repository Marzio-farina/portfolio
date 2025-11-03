import { Component, input, output, signal, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit } from '@angular/core';

export interface TextStyle {
  fontSize?: number;          // Dimensione font in px
  fontWeight?: 'normal' | 'bold';  // Grassetto
  fontStyle?: 'normal' | 'italic';  // Corsivo
  textDecoration?: string;    // Sottolineato, barrato (underline, line-through)
  color?: string;             // Colore testo
  fontFamily?: string;        // Font family
}

@Component({
  selector: 'app-text-formatting-toolbar',
  standalone: true,
  imports: [],
  templateUrl: './text-formatting-toolbar.component.html',
  styleUrl: './text-formatting-toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextFormattingToolbarComponent implements AfterViewInit {
  // Input: stili correnti del testo
  currentStyle = input<TextStyle>({});
  
  // Output: quando lo stile cambia
  styleChanged = output<TextStyle>();
  
  // Stato interno toolbar
  showColorPicker = signal(false);
  
  // Segnali per lo stato dei pulsanti di formattazione
  private boldState = signal(false);
  private italicState = signal(false);
  private underlineState = signal(false);
  private strikethroughState = signal(false);
  private colorState = signal('#000000');
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngAfterViewInit(): void {
    // Aggiorna lo stato iniziale dopo il rendering
    setTimeout(() => this.updateFormattingStates(), 0);
  }
  
  /**
   * Aggiorna tutti gli stati di formattazione leggendo dal DOM
   */
  private updateFormattingStates(): void {
    this.boldState.set(this.checkBoldState());
    this.italicState.set(this.checkItalicState());
    this.underlineState.set(this.checkUnderlineState());
    this.strikethroughState.set(this.checkStrikethroughState());
    this.colorState.set(this.checkCurrentColor());
  }
  
  /**
   * Salva e ripristina la selezione corrente
   */
  private savedSelection: Range | null = null;
  private savedElement: HTMLElement | null = null;

  private saveSelection(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedSelection = selection.getRangeAt(0).cloneRange();
      // Salva anche l'elemento che contiene la selezione
      const container = this.savedSelection.commonAncestorContainer;
      this.savedElement = (container.nodeType === 3 ? container.parentElement : container) as HTMLElement;
    }
  }

  private restoreSelection(): void {
    if (this.savedSelection && this.savedElement) {
      try {
        // Ripristina il focus sull'elemento
        if (this.savedElement.focus) {
          this.savedElement.focus();
        }
        // Ripristina la selezione
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(this.savedSelection);
        }
      } catch (e) {
        console.warn('Impossibile ripristinare la selezione', e);
      }
    }
  }

  /**
   * Toggle grassetto
   * NOTA: execCommand è deprecato ma ancora supportato da tutti i browser.
   * Alternativa futura: usare Selection API + DOM manipulation o librerie come Quill/TinyMCE
   */
  toggleBold(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
    }
    this.saveSelection();
    this.restoreSelection();
    // @ts-ignore - execCommand è deprecato ma ancora funzionante
    document.execCommand('bold', false);
    setTimeout(() => this.boldState.set(this.checkBoldState()), 0);
  }
  
  /**
   * Toggle corsivo
   */
  toggleItalic(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
    }
    this.saveSelection();
    this.restoreSelection();
    // @ts-ignore - execCommand è deprecato ma ancora funzionante
    document.execCommand('italic', false);
    setTimeout(() => this.italicState.set(this.checkItalicState()), 0);
  }
  
  /**
   * Toggle sottolineato
   */
  toggleUnderline(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
    }
    this.saveSelection();
    this.restoreSelection();
    // @ts-ignore - execCommand è deprecato ma ancora funzionante
    document.execCommand('underline', false);
    setTimeout(() => this.underlineState.set(this.checkUnderlineState()), 0);
  }
  
  /**
   * Toggle barrato
   */
  toggleStrikethrough(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
    }
    this.saveSelection();
    this.restoreSelection();
    // @ts-ignore - execCommand è deprecato ma ancora funzionante
    document.execCommand('strikeThrough', false);
    setTimeout(() => this.strikethroughState.set(this.checkStrikethroughState()), 0);
  }
  
  /**
   * Cambia colore
   */
  changeColor(color: string, closePopup: boolean = false): void {
    this.saveSelection();
    this.restoreSelection();
    // @ts-ignore - execCommand è deprecato ma ancora funzionante
    document.execCommand('foreColor', false, color);
    setTimeout(() => this.colorState.set(color), 0);
    
    // Chiudi il popup se richiesto (per i colori predefiniti)
    if (closePopup) {
      this.showColorPicker.set(false);
    }
  }
  
  /**
   * Chiude il popup del color picker
   */
  closeColorPicker(): void {
    this.showColorPicker.set(false);
  }
  
  /**
   * Getter pubblici per lo stato dei pulsanti (usano i segnali)
   */
  isBold(): boolean {
    return this.boldState();
  }
  
  isItalic(): boolean {
    return this.italicState();
  }
  
  isUnderline(): boolean {
    return this.underlineState();
  }
  
  isStrikethrough(): boolean {
    return this.strikethroughState();
  }
  
  getCurrentColor(): string {
    return this.colorState();
  }
  
  /**
   * Metodi privati per controllare lo stato effettivo dal DOM
   */
  private checkBoldState(): boolean {
    try {
      // @ts-ignore - queryCommandState è deprecato ma ancora funzionante
      return document.queryCommandState('bold');
    } catch {
      return false;
    }
  }
  
  private checkItalicState(): boolean {
    try {
      // @ts-ignore - queryCommandState è deprecato ma ancora funzionante
      return document.queryCommandState('italic');
    } catch {
      return false;
    }
  }
  
  private checkUnderlineState(): boolean {
    try {
      // @ts-ignore - queryCommandState è deprecato ma ancora funzionante
      return document.queryCommandState('underline');
    } catch {
      return false;
    }
  }
  
  private checkStrikethroughState(): boolean {
    try {
      // @ts-ignore - queryCommandState è deprecato ma ancora funzionante
      return document.queryCommandState('strikeThrough');
    } catch {
      return false;
    }
  }
  
  private checkCurrentColor(): string {
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === 3 ? container.parentElement : container as HTMLElement;
        
        if (element) {
          const color = window.getComputedStyle(element).color;
          return this.rgbToHex(color);
        }
      }
    } catch {
      // Fallback
    }
    return '#000000';
  }
  
  /**
   * Converte RGB a HEX
   */
  private rgbToHex(rgb: string): string {
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return rgb;
  }
  
  /**
   * Toggle color picker
   */
  toggleColorPicker(): void {
    this.showColorPicker.update(v => !v);
  }
}

