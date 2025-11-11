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
  
  // Form state per aggiunta nuovo item
  isAdding = signal(false);
  tempTitle = '';
  tempStartDate = '';
  tempEndDate = '';
  tempDescription = '';
  isInCorso = signal(false);
  
  // Timer per auto-chiusura se inattivo
  private inactivityTimer: any = null;
  
  // Output per notificare il parent dell'aggiunta e eliminazione
  addItem = output<NewCvItem>();
  deleteItem = output<{ title: string; years: string; type: 'education' | 'experience' }>();
  
  
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
          type: this.type()
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
   */
  startAdd(): void {
    this.isAdding.set(true);
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
      type: this.type()
    });
    
    // Reset form e chiudi editing
    this.resetForm();
  }
  
  
  /**
   * Reset form e chiudi editing
   */
  private resetForm(): void {
    this.clearInactivityTimer();
    this.isAdding.set(false);
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
