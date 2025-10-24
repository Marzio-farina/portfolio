import { Component, input, output, signal, effect, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.css'
})
export class Notification implements OnDestroy, AfterViewInit {
  // Inputs
  message = input<string>('');
  type = input<NotificationType>('info');
  show = input<boolean>(false);
  autoCollapse = input<boolean>(true);
  collapseDelay = input<number>(1500); // 1.5 secondi


  // State
  isCollapsed = signal(false);
  isIconInCorner = signal(false);
  private collapseTimer?: number;
  
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
  }

  ngAfterViewInit() {
    // Inizializza lo stato dell'animazione
    if (this.notificationElement) {
      this.resetToInitialState();
    }
  }

  ngOnDestroy() {
    this.clearCollapseTimer();
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
      this.animateToExpanded();
    }
  }

  onMouseLeave() {
    this.isHovering = false;
    // Quando il mouse esce, riavvia il timer di auto-collapse se necessario
    if (this.autoCollapse() && !this.isCollapsed()) {
      this.startCollapseTimer();
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
    message.style.flex = '1';
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
        message.style.flex = '1';
        
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
    message.style.flex = '1';
    
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
      
      // Fase 1: L'icona scompare dall'angolo e il contenitore principale diventa visibile
      if (progress < 0.4) {
        // Il contenitore principale rimane invariato (usa le classi CSS)
        
        // L'icona scompare gradualmente dall'angolo (icona separata)
        // L'icona separata viene nascosta automaticamente dal CSS quando isIconInCorner è false
      }
      
      // Fase 2: Il messaggio scende dall'alto verso il centro
      else {
        const messageProgress = (progress - 0.4) * (1 / 0.6); // Da 0 a 1 nella seconda fase
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
        message.style.flex = '1';
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
}
