import { Directive, ElementRef, Input, OnInit, OnDestroy, inject } from '@angular/core';

/**
 * Lazy Load Directive
 * 
 * Carica le immagini solo quando entrano nel viewport
 * Usa IntersectionObserver per performance ottimali
 */
@Directive({
  selector: 'img[appLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit, OnDestroy {
  @Input() appLazyLoad: string = ''; // URL immagine da caricare
  @Input() lazyPlaceholder: string = ''; // Placeholder mentre carica

  private elementRef = inject(ElementRef);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    // Imposta placeholder iniziale
    if (this.lazyPlaceholder) {
      this.elementRef.nativeElement.src = this.lazyPlaceholder;
    }

    // Crea IntersectionObserver
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage();
          }
        });
      },
      {
        rootMargin: '50px', // Carica 50px prima che entri nel viewport
        threshold: 0.01
      }
    );

    // Osserva l'elemento
    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private loadImage(): void {
    const img = this.elementRef.nativeElement as HTMLImageElement;
    
    // Carica l'immagine reale
    if (this.appLazyLoad && img.src !== this.appLazyLoad) {
      img.src = this.appLazyLoad;
      
      // Aggiungi classe quando caricata
      img.onload = () => {
        img.classList.add('loaded');
      };
      
      // Disconnetti observer dopo il caricamento
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }
}

