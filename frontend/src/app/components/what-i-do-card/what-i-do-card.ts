import { Component, computed, input, signal, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-what-i-do-card',
  standalone: true,
  templateUrl: './what-i-do-card.html',
  styleUrls: ['./what-i-do-card.css']
})
export class WhatIDoCard implements AfterViewInit, OnDestroy {
  title = input<string>('');
  description = input<string>('');
  icon = input<string>('');
  clampChars = input<number>(65);               // limite caratteri preview

  // overlay on/off
  overlayOpen = signal(false);

  // testo mostrato nella card (sempre 65 char + … se serve). NON cambia quando l'overlay è aperto
  displayText = computed(() => {
    const full = this.description() ?? '';
    const limit = this.clampChars();
    if (full.length <= limit) return full;

    const cut = full.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    return base.trimEnd() + '…';
  });

  private cardElement?: HTMLElement;
  private mouseMoveListener?: (event: MouseEvent) => void;
  private mouseLeaveListener?: () => void;
  private mouseEnterListener?: () => void;
  private isMouseInside = false;
  private animationFrameId?: number;
  private currentRotateX = 0;
  private currentRotateY = 0;
  private targetRotateX = 0;
  private targetRotateY = 0;
  private isAnimating = false;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    this.cardElement = this.elementRef.nativeElement.querySelector('.card');
    if (this.cardElement) {
      this.setupTiltEffect();
    }
  }

  ngOnDestroy() {
    this.removeTiltEffect();
  }

  private setupTiltEffect() {
    if (!this.cardElement) return;

    this.mouseEnterListener = () => {
      this.isMouseInside = true;
    };

    this.mouseMoveListener = (event: MouseEvent) => {
      if (!this.cardElement || !this.isMouseInside) return;

      const rect = this.cardElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const mouseX = event.clientX - centerX;
      const mouseY = event.clientY - centerY;
      
      // Calcola l'angolo di rotazione basato sulla posizione del mouse
      // Limita la rotazione per un effetto più sottile e controllato
      const maxRotation = 15; // Massimo 15 gradi di rotazione
      this.targetRotateX = Math.max(-maxRotation, Math.min(maxRotation, (mouseY / rect.height) * -maxRotation));
      this.targetRotateY = Math.max(-maxRotation, Math.min(maxRotation, (mouseX / rect.width) * maxRotation));
      
      this.animateToTarget();
    };

    this.mouseLeaveListener = () => {
      this.isMouseInside = false;
      this.targetRotateX = 0;
      this.targetRotateY = 0;
      this.animateToTarget();
    };

    this.cardElement.addEventListener('mouseenter', this.mouseEnterListener);
    this.cardElement.addEventListener('mousemove', this.mouseMoveListener);
    this.cardElement.addEventListener('mouseleave', this.mouseLeaveListener);
  }

  private animateToTarget() {
    if (!this.cardElement) return;

    // Se c'è già un'animazione in corso, la cancella
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.isAnimating = true;
    const startTime = performance.now();
    const duration = this.isMouseInside ? 100 : 300; // Più veloce quando il mouse è dentro

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function per transizione smooth
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // Interpola tra la posizione corrente e quella target
      this.currentRotateX = this.currentRotateX + (this.targetRotateX - this.currentRotateX) * easeOut;
      this.currentRotateY = this.currentRotateY + (this.targetRotateY - this.currentRotateY) * easeOut;
      
      // Applica la trasformazione
      this.cardElement!.style.transform = `perspective(1000px) rotateX(${this.currentRotateX}deg) rotateY(${this.currentRotateY}deg) translateZ(10px)`;
      
      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.animationFrameId = undefined;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private resetCardPosition() {
    if (!this.cardElement) return;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.isAnimating = false;
    this.currentRotateX = 0;
    this.currentRotateY = 0;
    this.targetRotateX = 0;
    this.targetRotateY = 0;
    this.cardElement.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
  }

  private removeTiltEffect() {
    if (this.cardElement) {
      if (this.mouseEnterListener) {
        this.cardElement.removeEventListener('mouseenter', this.mouseEnterListener);
      }
      if (this.mouseMoveListener) {
        this.cardElement.removeEventListener('mousemove', this.mouseMoveListener);
      }
      if (this.mouseLeaveListener) {
        this.cardElement.removeEventListener('mouseleave', this.mouseLeaveListener);
      }
    }
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}