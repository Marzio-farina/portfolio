import { Component, input, output, signal, computed, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimelineItem } from '../timeline-item/timeline-item';

type Item = { title: string; years: string; description: string };

export interface NewCvItem {
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD o null se "In Corso"
  description: string;
  type: 'education' | 'experience';
  insertPosition: number; // Indice dove inserire il nuovo elemento (0 = inizio, n = dopo n-esimo elemento)
  isEdit?: boolean; // True se si sta modificando un record esistente
  originalItem?: { title: string; years: string }; // Dati originali per identificare il record da modificare
}

@Component({
  selector: 'app-resume-section',
  imports: [
    TimelineItem,
    FormsModule
  ],
  templateUrl: './resume-section.html',
  styleUrl: './resume-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush // ⚡ Performance boost
})
export class ResumeSection {
  id = input.required<string>();
  title = input.required<string>();
  icon = input<'book' | 'briefcase' | 'star'>('book');
  items = input<Item[]>([]);
  open = input<boolean, boolean | undefined>(true, { transform: v => !!v });
  canEdit = input<boolean>(false); // Modalità edit abilitata
  type = input.required<'education' | 'experience'>(); // Tipo di CV

  isOpen = signal(this.open());
  
  // Computed per verificare se ci sono items
  hasItems = computed(() => (this.items()?.length ?? 0) > 0);
  
  // Form state per aggiunta/modifica item
  isAdding = signal(false);
  editingIndex = signal<number>(-1); // -1 = nessuno, >= 0 = indice dell'item che si sta modificando
  insertPosition = signal<number>(0); // Posizione dove inserire (0 = inizio, n = dopo n-esimo elemento)
  originalItem: { title: string; years: string } | null = null; // Dati originali per identificare il record da modificare
  tempTitle = '';
  tempStartDate = '';
  tempEndDate = '';
  tempDescription = '';
  isInCorso = signal(false);
  
  // Timer per auto-chiusura se inattivo
  private inactivityTimer: any = null;
  
  // Output per notificare il parent dell'aggiunta, eliminazione e riordino
  addItem = output<NewCvItem>();
  deleteItem = output<{ title: string; years: string; type: 'education' | 'experience' }>();
  reorderItems = output<{ fromIndex: number; toIndex: number; type: 'education' | 'experience' }>();
  
  // Stato drag & drop
  draggingItem = signal<{ title: string; years: string } | null>(null);
  dropTargetIndex = signal<number>(-1);
  
  
  /**
   * Gestisce i tasti ESC e INVIO quando in editing
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isAdding()) {
      return;
    }
    
    // ESC → Chiudi senza salvare
    if (event.key === 'Escape') {
      event.preventDefault();
      this.resetForm();
      return;
    }
    
    // INVIO → Salva se i campi sono validi
    if (event.key === 'Enter' && !event.shiftKey) {
      // Permetti SHIFT+INVIO nelle textarea per andare a capo
      const target = event.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true') {
        return; // Lascia che INVIO inserisca una nuova riga
      }
      
      event.preventDefault();
      
      const title = this.tempTitle.trim();
      const startDate = this.tempStartDate.trim();
      
      // Validazione: serve almeno titolo e data inizio
      if (title && startDate) {
        this.addItem.emit({
          title,
          startDate,
          endDate: this.isInCorso() ? null : (this.tempEndDate.trim() || null),
          description: this.tempDescription.trim(),
          type: this.type(),
          insertPosition: this.insertPosition(),
          isEdit: this.editingIndex() >= 0,
          originalItem: this.originalItem || undefined
        });
        this.resetForm();
      }
      // Se non validi, non fare nulla (mantieni aperto)
    }
  }

  toggle() {
    this.isOpen.update(v => !v);
  }
  
  /**
   * Avvia l'aggiunta di un nuovo elemento (espande il pulsante come timeline-item)
   * @param position Posizione dove inserire (0 = inizio, n = dopo n-esimo elemento)
   */
  startAdd(position: number = 0): void {
    this.clearInactivityTimer();
    
    this.isAdding.set(true);
    this.editingIndex.set(-1); // Modalità aggiunta, non modifica
    this.insertPosition.set(position);
    this.originalItem = null; // Nessun item originale da modificare
    this.tempTitle = '';
    this.tempStartDate = '';
    this.tempEndDate = '';
    this.tempDescription = '';
    this.isInCorso.set(false);
    
    // Avvia timer di inattività (5 secondi)
    this.startInactivityTimer();
    
    // Auto-focus sul titolo dopo il render
    setTimeout(() => {
      const titleElement = document.querySelector(`#${this.id()}-panel .timeline__title[contenteditable]`) as HTMLElement;
      if (titleElement) {
        titleElement.focus();
      }
    }, 100);
  }
  
  /**
   * Toggle checkbox "In Corso"
   */
  toggleInCorso(): void {
    this.isInCorso.update(v => !v);
    if (this.isInCorso()) {
      this.tempEndDate = '';
    }
    // Reset timer quando l'utente interagisce
    this.resetInactivityTimer();
  }
  
  /**
   * Gestisce l'eliminazione di un elemento (senza conferma, eliminazione ottimistica)
   */
  onDelete(item: Item): void {
    this.deleteItem.emit({
      title: item.title,
      years: item.years,
      type: this.type()
    });
  }
  
  /**
   * Gestisce il click su un elemento per modificarlo
   */
  onEdit(item: Item, index: number): void {
    // Chiudi il form corrente se aperto
    this.clearInactivityTimer();
    
    // Imposta modalità modifica
    this.isAdding.set(true);
    this.editingIndex.set(index);
    this.insertPosition.set(index);
    
    // Salva i dati originali per identificare il record da modificare nel backend
    this.originalItem = { title: item.title, years: item.years };
    
    // Precompila i campi con i dati esistenti
    this.tempTitle = item.title;
    
    // Estrai le date dal formato "dd/mm/yyyy — dd/mm/yyyy" o "dd/mm/yyyy — In Corso"
    const [startStr, endStr] = item.years.split('—').map(s => s.trim());
    
    // Converti da formato italiano (dd/mm/yyyy) a ISO (yyyy-mm-dd)
    const parseItDate = (dateStr: string): string => {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return '';
    };
    
    this.tempStartDate = parseItDate(startStr);
    
    if (endStr.toLowerCase() === 'in corso') {
      this.isInCorso.set(true);
      this.tempEndDate = '';
    } else {
      this.isInCorso.set(false);
      this.tempEndDate = parseItDate(endStr);
    }
    
    this.tempDescription = item.description;
    
    // Avvia timer di inattività
    this.startInactivityTimer();
    
    // Auto-focus e popola i campi contenteditable dopo il render
    setTimeout(() => {
      const titleElement = document.querySelector(`#${this.id()}-panel .timeline__title[contenteditable]`) as HTMLElement;
      const descElement = document.querySelector(`#${this.id()}-panel .timeline__description[contenteditable]`) as HTMLElement;
      
      if (titleElement) {
        titleElement.textContent = this.tempTitle;
        titleElement.focus();
      }
      
      if (descElement) {
        descElement.textContent = this.tempDescription;
      }
    }, 100);
  }
  
  /**
   * Gestisce l'input del titolo (contenteditable)
   */
  onTitleInput(event: Event): void {
    const target = event.target as HTMLElement;
    this.tempTitle = target.textContent?.trim() || '';
    // Reset timer inattività quando l'utente scrive
    this.resetInactivityTimer();
  }
  
  /**
   * Gestisce il blur del titolo
   */
  onTitleBlur(event: Event): void {
    const target = event.target as HTMLElement;
    this.tempTitle = target.textContent?.trim() || '';
    this.autoSave();
  }
  
  /**
   * Gestisce l'input della descrizione (contenteditable)
   */
  onDescriptionInput(event: Event): void {
    const target = event.target as HTMLElement;
    this.tempDescription = target.textContent?.trim() || '';
    // Reset timer inattività quando l'utente scrive
    this.resetInactivityTimer();
  }
  
  /**
   * Gestisce il blur della descrizione
   */
  onDescriptionBlur(event: Event): void {
    const target = event.target as HTMLElement;
    this.tempDescription = target.textContent?.trim() || '';
    this.autoSave();
  }
  
  /**
   * Salvataggio automatico quando l'utente finisce di editare
   */
  autoSave(): void {
    const title = this.tempTitle.trim();
    const startDate = this.tempStartDate.trim();
    
    // Validazione minima: serve almeno titolo e data inizio
    if (!title || !startDate) {
      return; // Non salvare se mancano dati essenziali
    }
    
    // Emetti l'evento verso il parent
    this.addItem.emit({
      title,
      startDate,
      endDate: this.isInCorso() ? null : (this.tempEndDate.trim() || null),
      description: this.tempDescription.trim(),
      type: this.type(),
      insertPosition: this.insertPosition(),
      isEdit: this.editingIndex() >= 0,
      originalItem: this.originalItem || undefined
    });
    
    // Reset form e chiudi editing
    this.resetForm();
  }
  
  
  /**
   * Reset form e chiudi editing
   * Pubblico perché chiamato dal template (click sul chevron)
   */
  resetForm(): void {
    this.clearInactivityTimer();
    this.isAdding.set(false);
    this.editingIndex.set(-1);
    this.insertPosition.set(0);
    this.originalItem = null;
    this.tempTitle = '';
    this.tempStartDate = '';
    this.tempEndDate = '';
    this.tempDescription = '';
    this.isInCorso.set(false);
  }
  
  /**
   * Avvia il timer di inattività (5 secondi)
   * Se l'utente non scrive nulla e i campi sono vuoti, chiude il form
   */
  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    
    this.inactivityTimer = setTimeout(() => {
      // Controlla se tutti i campi sono ancora vuoti
      const title = this.tempTitle.trim();
      const startDate = this.tempStartDate.trim();
      const endDate = this.tempEndDate.trim();
      const description = this.tempDescription.trim();
      
      if (!title && !startDate && !endDate && !description) {
        // Tutti vuoti → chiudi automaticamente
        this.resetForm();
      }
    }, 5000); // 5 secondi
  }
  
  /**
   * Resetta il timer di inattività quando l'utente scrive (pubblico per chiamata da template)
   */
  resetInactivityTimer(): void {
    this.startInactivityTimer();
  }
  
  /**
   * Cancella il timer di inattività
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
  
  /**
   * Gestisce l'inizio del drag di un elemento
   */
  onDragStart(item: { title: string; years: string }): void {
    this.draggingItem.set(item);
  }
  
  /**
   * Gestisce il drag over un elemento (permette il drop)
   */
  onDragOver(event: Event, index: number): void {
    event.preventDefault(); // Necessario per permettere il drop
    this.dropTargetIndex.set(index);
  }
  
  /**
   * Gestisce il drop di un elemento
   */
  onDrop(toIndex: number): void {
    const draggedItem = this.draggingItem();
    if (!draggedItem) return;
    
    // Trova l'indice dell'elemento trascinato
    const fromIndex = this.items().findIndex(
      it => it.title === draggedItem.title && it.years === draggedItem.years
    );
    
    if (fromIndex === -1 || fromIndex === toIndex) {
      this.draggingItem.set(null);
      this.dropTargetIndex.set(-1);
      return;
    }
    
    // Emetti l'evento di riordino verso il parent
    this.reorderItems.emit({
      fromIndex,
      toIndex,
      type: this.type()
    });
    
    // Reset stato drag
    this.draggingItem.set(null);
    this.dropTargetIndex.set(-1);
  }
  
  /**
   * Gestisce la fine del drag (anche se non droppato)
   */
  onDragEnd(): void {
    this.draggingItem.set(null);
    this.dropTargetIndex.set(-1);
  }

  get iconPath(): string {
    switch (this.icon()) {
      case 'briefcase':
        // Icona portfolio/cubo per esperienze lavorative
        return 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12';
      case 'star':
        return 'M12 3l3 6h6l-5 4 2 6-6-3.5L6 19l2-6-5-4h6z';
      default:
        // Icona diploma/graduation cap per studi
        return 'M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5';
    }
  }
}
