import { Component, input, output, signal, effect, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  fieldId: string;
}

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.css'
})
export class Notification implements OnDestroy, AfterViewInit {
  // Inputs per notifiche singole (compatibilità)
  message = input<string>('');
  type = input<NotificationType>('info');
  show = input<boolean>(false);
  autoCollapse = input<boolean>(true);
  collapseDelay = input<number>(1500); // 1.5 secondi
  
  // Inputs per notifiche multiple
  notifications = input<NotificationItem[]>([]);
  showMultiple = input<boolean>(false);
  mostSevereNotification = input<NotificationItem | null>(null);


  // State
  isCollapsed = signal(false);
  isIconInCorner = signal(false);
  private collapseTimer?: number;
  
  // State per notifiche multiple
  visibleNotifications = signal<NotificationItem[]>([]);
  collapsedNotifications = signal<NotificationItem[]>([]);
  private notificationTimers = new Map<string, number>();
  private hoverTimer?: number;
  isHoveringIcon = signal(false);
  
  // Animation state
  @ViewChild('notificationElement', { static: false }) notificationElement?: ElementRef<HTMLElement>;
  @ViewChild('messageContainer', { static: false }) messageContainer?: ElementRef<HTMLElement>;
  @ViewChild('messageElement', { static: false }) messageElement?: ElementRef<HTMLElement>;
  @ViewChild('iconContainer', { static: false }) iconContainer?: ElementRef<HTMLElement>;
  @ViewChild('iconElement', { static: false }) iconElement?: ElementRef<HTMLElement>;
  @ViewChild('cornerIconContainer', { static: false }) cornerIconContainer?: ElementRef<HTMLElement>;
  
  private isAnimating = false;
  private animationFrame?: number;
  private isHovering = false;

  constructor() {
    // Effect per gestire l'auto-collapse
    effect(() => {
      if (this.show() && this.autoCollapse()) {
        this.startCollapseTimer();
      } else {
        this.clearCollapseTimer();
      }
    });

    // Effect per gestire le notifiche multiple
    effect(() => {
      if (this.showMultiple()) {
        const currentNotifications = this.notifications();
        if (currentNotifications.length > 0) {
          // Usa setTimeout per evitare loop infiniti
          setTimeout(() => {
            this.handleMultipleNotifications();
          }, 0);
        }
      }
    });
  }

  ngAfterViewInit() {
    // Inizializza lo stato dell'animazione
    if (this.notificationElement) {
      this.resetToInitialState();
    }
  }

  ngOnDestroy() {
    this.clearCollapseTimer();
    this.clearHoverTimer();
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  private startCollapseTimer() {
    this.clearCollapseTimer();
    this.isCollapsed.set(false);
    this.resetToInitialState();
    
    this.collapseTimer = window.setTimeout(() => {
      // Solo se non sta facendo hover, collassa
      if (!this.isHovering) {
        this.animateToCollapsed();
      }
    }, this.collapseDelay());
  }

  private clearCollapseTimer() {
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = undefined;
    }
  }

  expand() {
    // Solo se è collassata, espandi
    if (this.isCollapsed()) {
      this.isHovering = true;
      this.clearCollapseTimer(); // Cancella il timer di auto-collapse
      this.isCollapsed.set(false);
      this.isIconInCorner.set(false); // Nasconde l'icona nell'angolo
      this.animateToExpanded();
    }
  }

  onMouseLeave() {
    this.isHovering = false;
    // Quando il mouse esce, riavvia il timer di auto-collapse se necessario
    if (this.autoCollapse() && !this.isCollapsed()) {
      this.startCollapseTimer();
    } else if (this.isCollapsed()) {
      // Se è collassata, assicurati che l'icona nell'angolo sia visibile
      this.isIconInCorner.set(true);
    }
  }

  private resetToInitialState() {
    if (!this.notificationElement || !this.messageContainer || !this.messageElement || !this.iconContainer || !this.iconElement) return;
    
    const notification = this.notificationElement.nativeElement;
    const messageContainer = this.messageContainer.nativeElement;
    const message = this.messageElement.nativeElement;
    const iconContainer = this.iconContainer.nativeElement;
    const icon = this.iconElement.nativeElement;
    
    // Il contenitore principale usa le classi CSS - rimuovi solo gli stili inline che potrebbero interferire
    notification.style.left = '';
    notification.style.transform = '';
    notification.style.maxWidth = '';
    notification.style.width = '';
    notification.style.minWidth = '';
    notification.style.height = '';
    notification.style.top = '';
    notification.style.overflow = '';
    notification.style.position = '';
    notification.style.right = '';
    
    // Messaggio completamente visibile
    messageContainer.style.opacity = '1';
    messageContainer.style.transform = 'translateX(0) translateY(0)';
    messageContainer.style.display = 'flex';
    messageContainer.style.visibility = 'visible';
    messageContainer.style.position = '';
    messageContainer.style.top = '';
    messageContainer.style.left = '';
    messageContainer.style.right = '';
    messageContainer.style.bottom = '';
    
    message.style.opacity = '1';
    message.style.transform = 'translateX(0) translateY(0)';
    message.style.display = 'block';
    message.style.visibility = 'visible';
    message.style.whiteSpace = '';
    message.style.overflow = '';
    
    // Icona completamente nascosta
    iconContainer.style.opacity = '0';
    iconContainer.style.display = 'none';
    iconContainer.style.visibility = 'hidden';
    // Rimuovi tutti gli stili inline per permettere al CSS di funzionare
    iconContainer.style.position = '';
    iconContainer.style.left = '';
    iconContainer.style.top = '';
    iconContainer.style.right = '';
    iconContainer.style.width = '';
    iconContainer.style.height = '';
    iconContainer.style.zIndex = '';
    iconContainer.style.transform = '';
    this.isIconInCorner.set(false);
    
    icon.style.width = '20px';
    icon.style.height = '20px';
  }

  private animateToCollapsed() {
    if (!this.notificationElement || !this.messageContainer || !this.messageElement || !this.iconContainer || !this.iconElement) return;
    
    this.isAnimating = true;
    this.isCollapsed.set(true);
    
    const notification = this.notificationElement.nativeElement;
    const messageContainer = this.messageContainer.nativeElement;
    const message = this.messageElement.nativeElement;
    const iconContainer = this.iconContainer.nativeElement;
    const icon = this.iconElement.nativeElement;
    
    const duration = 600; // 600ms per una transizione fluida
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // Fase 1: Il messaggio scorre verso l'alto e scompare
      if (progress < 0.7) {
        const messageProgress = progress / 0.7; // Da 0 a 1 nella prima fase
        const messageOpacity = 1 - messageProgress;
        const messageTranslateY = messageProgress * -120; // Scorre verso l'alto di 120px
        
        // Il contenitore principale rimane invariato (usa le classi CSS)
        
        // Anima il messaggio che scorre via
        messageContainer.style.opacity = `${messageOpacity}`;
        messageContainer.style.transform = `translateX(0) translateY(${messageTranslateY}px)`;
        messageContainer.style.display = 'flex';
        
        message.style.opacity = `${messageOpacity}`;
        message.style.transform = 'translateX(0) translateY(0)';
        message.style.display = 'block';
        
        // L'icona rimane nascosta
        iconContainer.style.opacity = '0';
        iconContainer.style.display = 'none';
      }
      
      // Fase 2: L'icona appare direttamente nell'angolo in alto a destra
      else {
        const iconProgress = (progress - 0.7) / 0.3; // Da 0 a 1 nella seconda fase
        
        // Il contenitore principale rimane invariato (usa le classi CSS)
        
        // Nasconde completamente il messaggio
        messageContainer.style.display = 'none';
        messageContainer.style.opacity = '0';
        messageContainer.style.transform = 'translateX(0) translateY(0)';
        
        // Mostra l'icona nell'angolo in alto a destra (usa icona separata)
        this.isIconInCorner.set(true);
      }
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        // Alla fine, mostra solo l'icona nell'angolo
        this.showIconOnly();
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  private showIconOnly() {
    if (!this.notificationElement || !this.messageContainer || !this.messageElement || !this.iconContainer || !this.iconElement) return;
    
    const notification = this.notificationElement.nativeElement;
    const messageContainer = this.messageContainer.nativeElement;
    const message = this.messageElement.nativeElement;
    const iconContainer = this.iconContainer.nativeElement;
    const icon = this.iconElement.nativeElement;
    
    // Il contenitore principale rimane invariato (usa le classi CSS)
    
    // Nasconde completamente il messaggio
    messageContainer.style.display = 'none';
    messageContainer.style.opacity = '0';
    messageContainer.style.transform = 'translateX(0) translateY(0)';
    
    message.style.display = 'none';
    message.style.opacity = '0';
    message.style.transform = 'translateX(0) translateY(0)';
    
    // Posiziona l'icona nell'angolo in alto a destra (usa icona separata)
    this.isIconInCorner.set(true);
    
    icon.style.width = '20px';
    icon.style.height = '20px';
  }

  private animateToExpanded() {
    if (!this.notificationElement || !this.messageContainer || !this.messageElement || !this.iconContainer || !this.iconElement) return;
    
    this.isAnimating = true;
    this.isIconInCorner.set(false);
    
    const notification = this.notificationElement.nativeElement;
    const messageContainer = this.messageContainer.nativeElement;
    const message = this.messageElement.nativeElement;
    const iconContainer = this.iconContainer.nativeElement;
    const icon = this.iconElement.nativeElement;
    
    const duration = 500; // 500ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // Fase 1: L'icona scompare dall'angolo (icona separata)
      if (progress < 0.3) {
        // L'icona separata viene nascosta automaticamente dal CSS quando isIconInCorner è false
        // Il contenitore principale rimane invariato (usa le classi CSS)
      }
      
      // Fase 2: Il messaggio scende dall'alto verso il centro
      else {
        const messageProgress = (progress - 0.3) * (1 / 0.7); // Da 0 a 1 nella seconda fase
        const messageOpacity = messageProgress;
        const messageTranslateY = (1 - messageProgress) * -120; // Scorre dall'alto (-120px) verso il centro (0px)
        
        // Mostra il contenitore del messaggio
        messageContainer.style.display = 'flex';
        messageContainer.style.opacity = `${messageOpacity}`;
        messageContainer.style.visibility = 'visible';
        messageContainer.style.transform = `translateX(0) translateY(${messageTranslateY}px)`;
        
        message.style.opacity = `${messageOpacity}`;
        message.style.visibility = 'visible';
        message.style.transform = `translateX(0) translateY(0)`;
        message.style.display = 'block';
      }
      
      // Il contenitore principale rimane invariato (usa le classi CSS)
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  getIconPath(): string {
    switch (this.type()) {
      case 'success':
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
      case 'error':
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z';
      case 'warning':
        return 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z';
      case 'info':
      default:
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';
    }
  }

  getNotificationIconPath(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
      case 'error':
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z';
      case 'warning':
        return 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z';
      case 'info':
      default:
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';
    }
  }



  // Metodi per gestire le notifiche multiple
  private handleMultipleNotifications() {
    const currentNotifications = this.notifications();
    const visible = this.visibleNotifications();
    const collapsed = this.collapsedNotifications();
    
    // Trova nuove notifiche che non sono già visibili o collassate
    // E che non hanno lo stesso messaggio di notifiche esistenti
    const newNotifications = currentNotifications.filter(
      notification => !visible.some(v => v.id === notification.id) && 
                    !collapsed.some(c => c.id === notification.id) &&
                    !visible.some(v => v.message === notification.message) &&
                    !collapsed.some(c => c.message === notification.message)
    );
    
    
    // Solo se ci sono nuove notifiche, aggiungile a quelle visibili
    if (newNotifications.length > 0) {
      this.visibleNotifications.set([...visible, ...newNotifications]);
      
      // Avvia timer SOLO per le nuove notifiche
      newNotifications.forEach(notification => {
        this.startNotificationTimer(notification.id);
      });
    }
    
    // Rimuovi notifiche che non sono più nell'array principale
    const toRemove = visible.filter(v => !currentNotifications.some(n => n.id === v.id));
    if (toRemove.length > 0) {
      this.visibleNotifications.set(visible.filter(v => currentNotifications.some(n => n.id === v.id)));
      
      // Rimuovi anche dalle collassate
      this.collapsedNotifications.set(collapsed.filter(c => currentNotifications.some(n => n.id === c.id)));
    }
  }

  private startNotificationTimer(notificationId: string) {
    // Cancella timer esistente se presente
    this.clearNotificationTimer(notificationId);
    
    // Avvia nuovo timer
    const timer = window.setTimeout(() => {
      this.collapseNotification(notificationId);
    }, this.collapseDelay());
    
    this.notificationTimers.set(notificationId, timer);
  }

  private clearNotificationTimer(notificationId: string) {
    const timer = this.notificationTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      this.notificationTimers.delete(notificationId);
    }
  }

  private startHoverTimer() {
    this.clearHoverTimer();
    this.hoverTimer = window.setTimeout(() => {
      this.restoreNormalState();
    }, 3000); // 3 secondi per l'hover
  }

  private restoreNormalState() {
    // Resetta il flag di hover
    this.isHoveringIcon.set(false);
    
    // Ripristina lo stato normale: mostra solo le notifiche che dovrebbero essere visibili
    // e rimetti le altre nelle collassate
    const allNotifications = this.notifications();
    
    // Determina quali notifiche dovrebbero essere visibili (quelle con timer attivo)
    const shouldBeVisible: NotificationItem[] = [];
    const shouldBeCollapsed: NotificationItem[] = [];
    
    allNotifications.forEach(notification => {
      // Se ha un timer attivo, dovrebbe essere visibile
      if (this.notificationTimers.has(notification.id)) {
        shouldBeVisible.push(notification);
      } else {
        shouldBeCollapsed.push(notification);
      }
    });
    
    this.visibleNotifications.set(shouldBeVisible);
    this.collapsedNotifications.set(shouldBeCollapsed);
  }

  private clearHoverTimer() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = undefined;
    }
  }

  private collapseNotification(notificationId: string) {
    // Non collassare se stiamo facendo hover sull'icona
    if (this.isHoveringIcon()) {
      return;
    }
    
    const visible = this.visibleNotifications();
    const notification = visible.find(n => n.id === notificationId);
    
    if (notification) {
      // Rimuovi dalle visibili
      this.visibleNotifications.set(visible.filter(n => n.id !== notificationId));
      
      // Aggiungi alle collassate
      this.collapsedNotifications.set([...this.collapsedNotifications(), notification]);
      
      // Cancella il timer
      this.clearNotificationTimer(notificationId);
    }
  }

  expandAllNotifications() {
    // Imposta il flag di hover
    this.isHoveringIcon.set(true);
    
    // Mostra TUTTE le notifiche (sia visibili che collassate)
    const allNotifications = this.notifications();
    
    // Mostra tutte le notifiche
    this.visibleNotifications.set([...allNotifications]);
    
    // Avvia il timer dell'hover (3 secondi) invece dei timer individuali
    this.startHoverTimer();
  }

  removeNotification(notificationId: string) {
    // Rimuovi dalle notifiche visibili
    const visible = this.visibleNotifications();
    this.visibleNotifications.set(visible.filter(n => n.id !== notificationId));
    
    // Rimuovi dalle notifiche collassate
    const collapsed = this.collapsedNotifications();
    this.collapsedNotifications.set(collapsed.filter(n => n.id !== notificationId));
    
    // Cancella il timer
    this.clearNotificationTimer(notificationId);
  }

  getMostSevereCollapsedType(): NotificationType {
    const collapsed = this.collapsedNotifications();
    if (collapsed.length === 0) return 'info';
    
    const severityOrder = { 'error': 0, 'warning': 1, 'info': 2, 'success': 3 };
    
    return collapsed.reduce((mostSevere, current) => {
      return severityOrder[current.type] < severityOrder[mostSevere] ? current.type : mostSevere;
    }, collapsed[0].type);
  }

  onCornerIconMouseLeave() {
    // Al mouse leave non succede nulla - il timer dell'hover gestisce tutto
  }

  onNotificationMouseEnter() {
    // Interrompe tutti i timer quando si fa hover sulle notifiche
    this.clearHoverTimer();
    
    // Interrompe tutti i timer delle notifiche individuali
    this.notificationTimers.forEach((timer, notificationId) => {
      clearTimeout(timer);
      this.notificationTimers.delete(notificationId);
    });
    
    // Resetta il flag di hover sull'icona
    this.isHoveringIcon.set(false);
  }

  onNotificationMouseLeave() {
    // Quando esci dalle notifiche, riavvia i timer per quelle che dovrebbero essere visibili
    const visible = this.visibleNotifications();
    const allNotifications = this.notifications();
    
    // Riavvia i timer solo per le notifiche che sono ancora nell'array principale
    visible.forEach(notification => {
      if (allNotifications.some(n => n.id === notification.id)) {
        this.startNotificationTimer(notification.id);
      }
    });
  }

}
