import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, take } from 'rxjs';

import { WhatIDoCard } from '../../components/what-i-do-card/what-i-do-card';
import { Bio } from '../../components/bio/bio';
import { WhatIDoService } from '../../services/what-i-do.service';
import { TenantService } from '../../services/tenant.service';
import { ProfileService, ProfileData } from '../../services/profile.service';
import { TestimonialCarouselCard } from '../../components/testimonial-carousel-card/testimonial-carousel-card';
import { Notification, NotificationItem } from '../../components/notification/notification';
import { EditModeService } from '../../services/edit-mode.service';
import { NotificationService } from '../../services/notification.service';

// ========================================================================
// Interfaces
// ========================================================================

interface AboutCard {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

/**
 * About Page Component
 * 
 * Displays personal information, skills, and testimonials.
 * Features horizontal scrolling carousel for testimonials.
 */
@Component({
  selector: 'app-about',
  imports: [
    WhatIDoCard,
    Bio,
    TestimonialCarouselCard,
    Notification
  ],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
  // ========================================================================
  // Dependencies
  // ========================================================================

  private readonly route = inject(ActivatedRoute);
  private readonly whatIDoApi = inject(WhatIDoService);
  private readonly tenant = inject(TenantService);
  private readonly profileApi = inject(ProfileService);
  readonly editMode = inject(EditModeService);
  private readonly notification = inject(NotificationService);


  // ========================================================================
  // Properties
  // ========================================================================

  /** Page title from route data */
  title = toSignal(
    this.route.data.pipe(map(data => data['title'] as string)), 
    { initialValue: '' }
  );

  // What I Do section
  cards = signal<AboutCard[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  toastMessage = signal<string | null>(null);
  toastNotifications = signal<NotificationItem[]>([]);
  
  // Creazione nuova card
  isCreatingCard = signal(false);
  newCardTitle = signal('');
  newCardDescription = signal('');
  
  // Icone disponibili per le card "What I Do" (dal file assets/icons.svg)
  readonly availableIcons = [
    // Web & Development
    'web-development',
    'mobile-development',
    'code',
    'terminal',
    'server',
    'database',
    'api',
    
    // DevOps & Infrastructure
    'docker',
    'network',
    'cpu',
    'package',
    'layers',
    'box',
    'cube',
    
    // Git & Version Control
    'git',
    'git-branch',
    'git-commit',
    'git-pull-request',
    
    // Design & Creative
    'design',
    'palette',
    'brush',
    'pen-tool',
    'camera',
    'video',
    'film',
    'image',
    'music',
    'feather',
    
    // Business & Commerce
    'briefcase',
    'shopping-cart',
    'shopping-bag',
    'credit-card',
    'dollar-sign',
    
    // Analytics & Data
    'analytics',
    'bar-chart',
    'pie-chart',
    'trending-up',
    'trending-down',
    'trending',
    'activity',
    'brain',
    'chart-network',
    'target',
    
    // Communication
    'users',
    'message-circle',
    'mail',
    'bell',
    'megaphone',
    'headphones',
    'mic',
    
    // Tools & Utilities
    'maintenance',
    'settings',
    'sliders',
    'compass',
    'search',
    'filter',
    'tag',
    
    // Cloud & Network
    'cloud',
    'globe',
    'wifi',
    'bluetooth',
    'share',
    'link',
    'download',
    'upload',
    'refresh',
    
    // Security
    'security',
    'lock',
    'unlock',
    'key',
    
    // Devices
    'smartphone',
    'tablet',
    
    // Files & Organization
    'folder',
    'file-text',
    'clipboard',
    'clipboard-check',
    'book',
    'book-open',
    
    // UI & Layout
    'layout',
    'grid',
    'blocks',
    'command',
    
    // Productivity
    'zap',
    'rocket',
    'lightbulb',
    'puzzle',
    'award',
    'graduation-cap',
    
    // Other
    'support',
    'check-circle',
    'heart',
    'gamepad',
    'slack',
    'trello',
    'edit',
    'type',
    'clock',
    'calendar',
    'trending-flat',
    'eye',
    'coins',
    'map',
    'map-pin',
    'navigation'
  ];
  
  selectedIconId = signal<string>('web-development'); // Icona selezionata
  iconPickerOpen = signal(false); // Stato apertura popup

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor() {
    this.loadWhatIDoData();
    // Ricarica quando cambia tenant
    const t = this.tenant; // cattura ref
    // usa micro-task per non interrompere il costruttore
    queueMicrotask(() => {
      const effectRef = (window as any).ngEffect?.(() => {
        void t.userId();
        this.loadWhatIDoData();
      });
    });
    const state = window.history.state as any;
    if (state && state.toast && state.toast.message) {
      // nota: alimenta sia il messaggio singolo che la pila multiple
      const msg = String(state.toast.message);
      this.toastMessage.set(msg);
      const item: NotificationItem = {
        id: `nav-${Date.now()}`,
        message: msg,
        type: state.toast.type ?? 'success',
        timestamp: Date.now(),
        fieldId: 'success'
      };
      this.toastNotifications.set([item]);
      history.replaceState({}, document.title);
    }
    
    // Chiudi icon picker quando si clicca fuori
    if (typeof document !== 'undefined') {
      document.addEventListener('click', (event: MouseEvent) => {
        if (this.iconPickerOpen()) {
          const target = event.target as HTMLElement;
          const picker = document.querySelector('.icon-picker-popup');
          const btn = document.querySelector('.icon-add-btn');
          
          if (picker && !picker.contains(target) && btn && !btn.contains(target)) {
            this.closeIconPicker();
          }
        }
      });
    }
  }

  // ========================================================================
  // Public Methods
  // ========================================================================


  /**
   * Track function for ngFor optimization
   * 
   * @param index Item index
   * @param card About card item
   * @returns Unique identifier
   */
  trackById = (_: number, card: AboutCard) => card.id;

  /**
   * Apre la modalità creazione nuova card
   */
  startCreateCard(): void {
    this.isCreatingCard.set(true);
    this.newCardTitle.set('');
    this.newCardDescription.set('');
    this.selectedIconId.set('web-development'); // Reset icona alla prima
    this.iconPickerOpen.set(false); // Chiudi popup se aperto
    
    // Focus sull'input del titolo dopo il rendering
    setTimeout(() => {
      const titleInput = document.querySelector('.card-edit__input--title') as HTMLInputElement;
      if (titleInput) {
        titleInput.focus();
      }
    }, 100);
  }

  /**
   * Annulla la creazione della card
   */
  cancelCreateCard(): void {
    this.isCreatingCard.set(false);
    this.newCardTitle.set('');
    this.newCardDescription.set('');
    this.selectedIconId.set('web-development');
    this.iconPickerOpen.set(false);
  }

  /**
   * Toggle apertura/chiusura icon picker
   */
  toggleIconPicker(event: Event): void {
    event.stopPropagation();
    this.iconPickerOpen.update(open => !open);
  }

  /**
   * Seleziona un'icona dal picker
   */
  selectIcon(iconId: string): void {
    this.selectedIconId.set(iconId);
    this.iconPickerOpen.set(false);
  }

  /**
   * Chiude il popup icon picker
   */
  closeIconPicker(): void {
    this.iconPickerOpen.set(false);
  }

  /**
   * Salva la nuova card con aggiornamento ottimistico
   */
  saveNewCard(): void {
    const title = this.newCardTitle().trim();
    const description = this.newCardDescription().trim();
    const icon = this.selectedIconId();

    // Guard: se i campi sono vuoti, non fare nulla (viene gestito dal blur)
    if (!title || !description) {
      return;
    }

    // Salva lo stato precedente per rollback
    const previousCards = this.cards();
    
    // 🚀 OPTIMISTIC UPDATE: Aggiungi immediatamente la card con ID temporaneo
    const tempId = `temp-${Date.now()}`;
    const newCard: AboutCard = {
      id: tempId,
      title,
      description,
      icon
    };
    
    this.cards.set([...previousCards, newCard]);
    
    // Reset stato editing
    this.cancelCreateCard();
    
    // Invia richiesta al backend
    this.whatIDoApi.create$({ title, description, icon }).pipe(take(1)).subscribe({
      next: (savedCard) => {
        // Sostituisci la card temporanea con quella salvata (con ID reale)
        const currentCards = this.cards();
        const updatedCards = currentCards.map(c => 
          c.id === tempId 
            ? { id: String(savedCard.id), title: savedCard.title, description: savedCard.description, icon: savedCard.icon }
            : c
        );
        this.cards.set(updatedCards);
        
        this.notification.add('success', 'Card aggiunta con successo', 'card-save', false);
      },
      error: (err) => {
        console.error('❌ Error saving card:', err);
        
        // ⚠️ ROLLBACK: Ripristina stato precedente
        this.cards.set(previousCards);
        
        this.notification.add('error', 'Errore durante il salvataggio della card', 'card-save', false);
      }
    });
  }

  /**
   * Gestisce il blur degli input - salva o annulla quando l'utente esce dalla card
   */
  onCardInputBlur(): void {
    // Usa setTimeout per permettere al focus di spostarsi su un altro elemento della card
    setTimeout(() => {
      // Controlla se il focus è ancora dentro la card
      const activeElement = document.activeElement;
      const cardElement = document.querySelector('.card--editing');
      
      if (cardElement && !cardElement.contains(activeElement)) {
        // L'utente è uscito dalla card
        const title = this.newCardTitle().trim();
        const description = this.newCardDescription().trim();
        
        if (title && description) {
          // Se ci sono modifiche valide, salva
          this.saveNewCard();
        } else {
          // Se i campi sono vuoti, annulla
          this.cancelCreateCard();
        }
      }
    }, 100);
  }

  /**
   * Elimina una card con aggiornamento ottimistico
   */
  deleteCard(cardId: string): void {
    const currentCards = this.cards();
    const cardToDelete = currentCards.find(c => c.id === cardId);
    
    if (!cardToDelete) {
      return;
    }

    // Salva lo stato precedente per rollback
    const previousCards = currentCards;
    
    // 🚀 OPTIMISTIC UPDATE: Rimuovi immediatamente la card
    this.cards.set(currentCards.filter(c => c.id !== cardId));
    
    // Converti l'ID in numero (rimuovendo eventuale prefisso "temp-")
    const numericId = parseInt(cardId.replace('temp-', ''), 10);
    
    if (isNaN(numericId)) {
      // Se l'ID non è valido (es. card temporanea non ancora salvata), non fare la chiamata API
      this.notification.add('error', 'Impossibile eliminare la card', 'card-delete', false);
      this.cards.set(previousCards);
      return;
    }
    
    // Invia richiesta al backend
    this.whatIDoApi.delete$(numericId).pipe(take(1)).subscribe({
      next: () => {
        this.notification.add('success', 'Card eliminata con successo', 'card-delete', false);
      },
      error: (err) => {
        console.error('❌ Error deleting card:', err);
        
        // ⚠️ ROLLBACK: Ripristina stato precedente
        this.cards.set(previousCards);
        
        this.notification.add('error', 'Errore durante l\'eliminazione della card', 'card-delete', false);
      }
    });
  }


  // ========================================================================
  // Private Methods
  // ========================================================================


  /**
   * Load "What I Do" data from API
   */
  private loadWhatIDoData(): void {
    const uid = this.tenant.userId();
    this.whatIDoApi.get$(uid ?? undefined).subscribe({
      next: items => {
        this.cards.set(items.map(item => ({
          id: String(item.id),
          title: item.title,
          description: item.description,
          icon: item.icon
        })));
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Impossibile caricare le card.');
        this.loading.set(false);
      }
    });
  }


}
