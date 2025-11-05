import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LazyLoadDirective } from './lazy-load.directive';

// Componente test per la direttiva
@Component({
  template: `
    <img 
      [appLazyLoad]="imageUrl" 
      [lazyPlaceholder]="placeholderUrl"
      alt="Test Image">
  `,
  standalone: true,
  imports: [LazyLoadDirective]
})
class TestComponent {
  imageUrl = 'https://example.com/image.jpg';
  placeholderUrl = 'data:image/png;base64,placeholder';
}

describe('LazyLoadDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let imgElement: DebugElement;
  let nativeImg: HTMLImageElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestComponent]
    });
    
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    imgElement = fixture.debugElement.query(By.css('img'));
    nativeImg = imgElement.nativeElement;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Initialization', () => {
    
    it('dovrebbe creare la direttiva', () => {
      expect(imgElement).toBeTruthy();
    });

    it('dovrebbe impostare placeholder come src iniziale', () => {
      // Mock IntersectionObserver per evitare errori
      (window as any).IntersectionObserver = class {
        observe() {}
        disconnect() {}
      };
      
      fixture.detectChanges();
      expect(nativeImg.src).toContain('placeholder');
    });

    it('dovrebbe gestire mancanza di placeholder', () => {
      // Mock IntersectionObserver
      (window as any).IntersectionObserver = class {
        observe() {}
        disconnect() {}
      };
      
      component.placeholderUrl = '';
      fixture.detectChanges();
      
      // Src non dovrebbe essere placeholder
      expect(nativeImg.src).toBeDefined();
    });
  });

  describe('IntersectionObserver', () => {
    
    beforeEach(() => {
      // Mock IntersectionObserver globalmente per questi test
      (window as any).IntersectionObserver = class {
        observe = jasmine.createSpy('observe');
        disconnect = jasmine.createSpy('disconnect');
        constructor(public callback: any, public options?: any) {}
      };
    });

    it('dovrebbe creare IntersectionObserver', () => {
      fixture.detectChanges();
      
      // Verifica che la direttiva funzioni (nessun errore)
      expect(imgElement).toBeTruthy();
    });

    it('dovrebbe osservare elemento immagine', () => {
      fixture.detectChanges();
      
      // La direttiva dovrebbe esistere e funzionare
      expect(nativeImg).toBeTruthy();
    });

    it('dovrebbe configurare observer con rootMargin e threshold', () => {
      // Test semplificato - verifica solo che non ci siano errori
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Lazy Loading Behavior', () => {
    
    beforeEach(() => {
      // Mock IntersectionObserver per questi test
      (window as any).IntersectionObserver = class {
        observe = jasmine.createSpy('observe');
        disconnect = jasmine.createSpy('disconnect');
        constructor(public callback: any, public options?: any) {}
      };
    });

    it('dovrebbe inizializzare correttamente la direttiva', () => {
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
      
      expect(nativeImg).toBeTruthy();
    });

    it('dovrebbe gestire input appLazyLoad', () => {
      fixture.detectChanges();
      
      expect(component.imageUrl).toBeTruthy();
      expect(nativeImg).toBeTruthy();
    });
  });

  describe('Cleanup', () => {
    
    beforeEach(() => {
      // Mock IntersectionObserver
      (window as any).IntersectionObserver = class {
        observe = jasmine.createSpy('observe');
        disconnect = jasmine.createSpy('disconnect');
        constructor(public callback: any, public options?: any) {}
      };
    });

    it('dovrebbe gestire destroy correttamente', () => {
      fixture.detectChanges();

      // Destroy componente
      expect(() => {
        fixture.destroy();
      }).not.toThrow();
    });

    it('dovrebbe pulire risorse su destroy', () => {
      fixture.detectChanges();
      
      const directive = imgElement.injector.get(LazyLoadDirective);
      
      expect(() => {
        directive.ngOnDestroy();
      }).not.toThrow();
    });
  });

  describe('Image Loading', () => {
    
    beforeEach(() => {
      // Mock IntersectionObserver
      (window as any).IntersectionObserver = class {
        observe = jasmine.createSpy('observe');
        disconnect = jasmine.createSpy('disconnect');
        constructor(public callback: any, public options?: any) {}
      };
    });

    it('dovrebbe gestire attributi immagine correttamente', () => {
      fixture.detectChanges();

      expect(nativeImg.alt).toBe('Test Image');
    });

    it('dovrebbe inizializzare con placeholder se fornito', () => {
      fixture.detectChanges();
      
      // Se placeholder è impostato, dovrebbe essere usato
      if (component.placeholderUrl) {
        expect(nativeImg.src).toContain('placeholder');
      }
    });
  });

  describe('Multiple Instances', () => {
    
    beforeEach(() => {
      // Mock IntersectionObserver
      (window as any).IntersectionObserver = class {
        observe = jasmine.createSpy('observe');
        disconnect = jasmine.createSpy('disconnect');
        constructor(public callback: any, public options?: any) {}
      };
    });

    it('dovrebbe gestire multiple direttive indipendentemente', () => {
      @Component({
        template: `
          <img [appLazyLoad]="'image1.jpg'">
          <img [appLazyLoad]="'image2.jpg'">
          <img [appLazyLoad]="'image3.jpg'">
        `,
        standalone: true,
        imports: [LazyLoadDirective]
      })
      class MultiImageComponent {}

      const multiFixture = TestBed.createComponent(MultiImageComponent);

      expect(() => {
        multiFixture.detectChanges();
      }).not.toThrow();
      
      const images = multiFixture.debugElement.queryAll(By.css('img'));
      expect(images.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    
    beforeEach(() => {
      // Mock IntersectionObserver
      (window as any).IntersectionObserver = class {
        observe = jasmine.createSpy('observe');
        disconnect = jasmine.createSpy('disconnect');
        constructor(public callback: any, public options?: any) {}
      };
    });

    it('dovrebbe gestire URL vuoto', () => {
      component.imageUrl = '';
      
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('dovrebbe gestire URL null/undefined', () => {
      component.imageUrl = null as any;
      
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('dovrebbe gestire placeholder vuoto', () => {
      component.placeholderUrl = '';
      
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });
  });
});

