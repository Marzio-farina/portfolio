import { Component, input, output, ElementRef, ViewChild, effect, signal, AfterViewInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextStyle } from '../text-formatting-toolbar/text-formatting-toolbar.component';

@Component({
  selector: 'app-custom-text-element',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-text-element.component.html',
  styleUrl: './custom-text-element.component.css'
})
export class CustomTextElementComponent implements AfterViewInit, AfterViewChecked {
  @ViewChild('editableDiv') editableDiv?: ElementRef<HTMLDivElement>;
  
  // Input: ID elemento (per generare id univoco)
  elementId = input<string>('custom-text');
  
  // Input: contenuto testo (HTML)
  content = input<string>('');
  
  // Input: stili testo (deprecato - ora gestito inline)
  textStyle = input<TextStyle>({});
  
  // Input: modalità edit
  isEditMode = input<boolean>(false);
  
  // Input: stato saving
  saving = input<boolean>(false);
  
  // Output: quando l'elemento riceve focus
  focused = output<void>();
  
  // Output: quando l'elemento perde focus
  blurred = output<void>();
  
  // Flag per evitare loop di aggiornamento
  private isFocused = signal(false);
  // Contenuto locale mentre l'utente sta scrivendo
  private localContent = '';
  // Flag per tracciare se il contenuto è stato sincronizzato con il ViewChild
  private contentSynced = false;
  
  constructor() {
    // Aggiorna il contenuto solo quando cambia dall'esterno e NON quando l'utente sta scrivendo
    effect(() => {
      const newContent = this.content();
      const div = this.editableDiv?.nativeElement;
      
      // Non aggiornare se:
      // 1. L'elemento è focused (l'utente sta scrivendo)
      // 2. Il contenuto è già uguale
      if (div && !this.isFocused() && div.innerHTML !== newContent) {
        // Sanitizza il contenuto prima di inserirlo nel DOM
        const sanitized = this.sanitizeHtml(newContent);
        div.innerHTML = sanitized;
        this.localContent = sanitized;
        this.contentSynced = true;
      } else if (!div) {
        // Se il ViewChild non è disponibile, resetta il flag
        this.contentSynced = false;
      }
    });

    // Effect per reagire al cambio di modalità edit
    // Quando si passa da view mode a edit mode, il ViewChild viene ricreato
    effect(() => {
      const isEdit = this.isEditMode();
      
      // Quando cambia la modalità, resetta il flag di sincronizzazione
      // in modo che ngAfterViewChecked possa aggiornare il contenuto
      if (isEdit) {
        this.contentSynced = false;
      }
    });
  }
  
  /**
   * Dopo l'inizializzazione della view, carica il contenuto iniziale
   */
  ngAfterViewInit(): void {
    // Forza l'aggiornamento del contenuto iniziale dopo il rendering
    setTimeout(() => {
      this.updateContent();
    }, 0);
  }

  /**
   * Dopo ogni check della view, assicurati che il contenuto sia sincronizzato
   * Questo è importante quando si passa da view mode a edit mode
   */
  ngAfterViewChecked(): void {
    // Se siamo in edit mode e il contenuto non è ancora sincronizzato
    if (this.isEditMode() && !this.contentSynced && this.editableDiv) {
      const newContent = this.content();
      const div = this.editableDiv.nativeElement;
      
      // Se il ViewChild è disponibile e il contenuto è diverso
      if (div && div.innerHTML !== newContent && !this.isFocused()) {
        const sanitized = this.sanitizeHtml(newContent);
        div.innerHTML = sanitized;
        this.localContent = sanitized;
        this.contentSynced = true;
      }
    }
  }
  
  /**
   * Aggiorna il contenuto del div editabile dal signal
   */
  private updateContent(): void {
    const newContent = this.content();
    const div = this.editableDiv?.nativeElement;
    
    if (div && !this.isFocused() && div.innerHTML !== newContent) {
      const sanitized = this.sanitizeHtml(newContent);
      div.innerHTML = sanitized;
      this.localContent = sanitized;
      this.contentSynced = true;
    }
  }
  
  /**
   * Sanitizza il contenuto HTML rimuovendo tag e attributi pericolosi
   * Mantiene solo formattazione sicura (b, i, u, span, etc.)
   */
  private sanitizeHtml(html: string): string {
    if (!html) return '';
    
    // Crea un elemento temporaneo per parsare l'HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Tag permessi per la formattazione
    const allowedTags = ['B', 'I', 'U', 'STRONG', 'EM', 'SPAN', 'BR', 'STRIKE', 'S', 'DEL'];
    
    // Attributi permessi
    const allowedAttributes = ['style'];
    
    // Rimuovi tutti gli elementi non permessi
    const removeUnsafeTags = (element: Element) => {
      const children = Array.from(element.children);
      
      children.forEach(child => {
        // Prima processa ricorsivamente i figli (per tutti i tipi di tag)
        removeUnsafeTags(child);
        
        if (!allowedTags.includes(child.tagName)) {
          // Se è un DIV o P (usati dai browser per i ritorni a capo), convertili in BR
          if (child.tagName === 'DIV' || child.tagName === 'P') {
            // Crea un fragment per mantenere il contenuto interno
            const fragment = document.createDocumentFragment();
            
            // Aggiungi un BR prima del contenuto (simula il ritorno a capo)
            if (child.previousSibling) {
              fragment.appendChild(document.createElement('br'));
            }
            
            // Sposta tutti i figli nel fragment (già processati dalla ricorsione)
            while (child.firstChild) {
              fragment.appendChild(child.firstChild);
            }
            
            // Sostituisci il DIV/P con il fragment
            child.replaceWith(fragment);
          } else {
            // Mantieni il contenuto testuale ma rimuovi il tag
            const textContent = child.textContent || '';
            const textNode = document.createTextNode(textContent);
            child.replaceWith(textNode);
          }
        } else {
          // Tag permesso: rimuovi solo attributi pericolosi
          Array.from(child.attributes).forEach(attr => {
            const attrName = attr.name.toLowerCase();
            // Rimuovi attributi non permessi e attributi che iniziano con 'on' (onclick, onload, etc.)
            if (!allowedAttributes.includes(attrName) || attrName.startsWith('on')) {
              child.removeAttribute(attr.name);
            }
          });
          
          // Se è uno span, verifica che lo style contenga solo proprietà sicure
          if (child.tagName === 'SPAN' && child.hasAttribute('style')) {
            const style = child.getAttribute('style') || '';
            // Rimuovi proprietà style pericolose (expression, behavior, etc.)
            if (style.toLowerCase().includes('expression') || 
                style.toLowerCase().includes('behavior') ||
                style.toLowerCase().includes('javascript:')) {
              child.removeAttribute('style');
            }
          }
        }
      });
    };
    
    removeUnsafeTags(temp);
    
    const cleaned = temp.innerHTML;
    
    // Se il contenuto è solo <br>, whitespace, o vuoto, ritorna stringa vuota
    const trimmedText = temp.textContent?.trim() || '';
    if (!trimmedText && (cleaned === '<br>' || cleaned === '<br/>' || cleaned === '<br />')) {
      return '';
    }
    
    return cleaned;
  }
  
  /**
   * Gestisce il cambio contenuto dal contenteditable
   * NON salva automaticamente - solo quando si preme il pulsante Salva
   */
  onContentChange(event: Event): void {
    const target = event.target as HTMLDivElement;
    const rawContent = target.innerHTML;
    
    // Sanitizza il contenuto per sicurezza
    const newContent = this.sanitizeHtml(rawContent);
    
    // Aggiorna solo il contenuto locale, senza salvare
    this.localContent = newContent;
  }
  
  /**
   * Gestisce il mousedown sul contenteditable
   */
  onEditableMouseDown(event: MouseEvent): void {
    // Stoppa propagazione per permettere editing e prevenire drag
    event.stopPropagation();
  }
  
  /**
   * Gestisce il focus sul contenteditable
   */
  onFocus(): void {
    this.isFocused.set(true);
    // Salva il contenuto corrente quando inizia a scrivere
    if (this.editableDiv) {
      this.localContent = this.editableDiv.nativeElement.innerHTML;
    }
    this.focused.emit();
  }
  
  /**
   * Gestisce il blur dal contenteditable
   */
  onBlur(): void {
    this.isFocused.set(false);
    
    // Salva il contenuto finale al blur (ma non emette evento - solo quando si preme Salva)
    if (this.editableDiv) {
      const rawContent = this.editableDiv.nativeElement.innerHTML;
      this.localContent = this.sanitizeHtml(rawContent);
    }
    
    // Ritardo più lungo per permettere movimento del mouse sulla toolbar
    setTimeout(() => {
      this.blurred.emit();
    }, 300);
  }
  
  /**
   * Ottiene il contenuto corrente sanitizzato
   * Metodo pubblico chiamato dal parent quando si preme Salva
   */
  getCurrentContent(): string {
    if (this.editableDiv) {
      const rawContent = this.editableDiv.nativeElement.innerHTML;
      const sanitized = this.sanitizeHtml(rawContent);
      
      // Se il contenuto è solo <br>, trattalo come vuoto
      // I browser aggiungono automaticamente <br> quando il contenteditable è vuoto
      if (sanitized === '<br>' || sanitized === '<br/>' || sanitized === '<br />' || sanitized.trim() === '') {
        return '';
      }
      
      return sanitized;
    }
    return this.localContent;
  }
  
}

