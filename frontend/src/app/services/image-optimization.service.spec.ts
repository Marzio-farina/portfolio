import { TestBed } from '@angular/core/testing';
import { ImageOptimizationService } from './image-optimization.service';

describe('ImageOptimizationService', () => {
  let service: ImageOptimizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ImageOptimizationService]
    });
    service = TestBed.inject(ImageOptimizationService);
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('generatePlaceholder', () => {
    
    it('dovrebbe generare placeholder base64 valido', () => {
      const placeholder = service.generatePlaceholder(800, 450);
      
      expect(placeholder).toBeTruthy();
      expect(placeholder).toContain('data:image/png;base64');
    });

    it('dovrebbe generare placeholder con colore custom', () => {
      const placeholder = service.generatePlaceholder(100, 100, '#ff0000');
      
      expect(placeholder).toBeTruthy();
      expect(placeholder).toContain('data:image/png;base64');
    });

    it('dovrebbe generare placeholder per dimensioni diverse', () => {
      const ph1 = service.generatePlaceholder(400, 300);
      const ph2 = service.generatePlaceholder(800, 600);
      
      expect(ph1).toBeTruthy();
      expect(ph2).toBeTruthy();
      // Dovrebbero essere stringhe diverse (dimensioni diverse)
      // Ma il placeholder è sempre 20x20, quindi potrebbero essere uguali con stesso colore
      expect(ph1).toContain('data:image/png;base64');
    });

    it('dovrebbe gestire canvas non supportato gracefully', () => {
      // Mock document.createElement per restituire canvas senza context
      const originalCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'canvas') {
          spyOn(element as HTMLCanvasElement, 'getContext').and.returnValue(null);
        }
        return element;
      });

      const placeholder = service.generatePlaceholder(100, 100);
      
      // Dovrebbe ritornare stringa vuota se canvas non supportato
      expect(placeholder).toBe('');
    });
  });

  describe('getResizedUrl', () => {
    
    it('dovrebbe ridimensionare URL Picsum con width', () => {
      const url = 'https://picsum.photos/seed/abc123';
      const resized = service.getResizedUrl(url, 640);
      
      expect(resized).toContain('/640/');
      expect(resized).toContain('/360'); // 640 * 9/16 = 360
    });

    it('dovrebbe ridimensionare URL Picsum con width e height custom', () => {
      const url = 'https://picsum.photos/seed/test';
      const resized = service.getResizedUrl(url, 800, 600);
      
      expect(resized).toContain('/800/600');
    });

    it('dovrebbe pulire dimensioni esistenti da URL Picsum', () => {
      const url = 'https://picsum.photos/1200/800/seed/old';
      const resized = service.getResizedUrl(url, 640);
      
      expect(resized).toContain('/640/');
      expect(resized).not.toContain('/1200/800');
    });

    it('dovrebbe ritornare URL originale per non-Picsum', () => {
      const url = 'https://example.com/image.jpg';
      const resized = service.getResizedUrl(url, 640);
      
      expect(resized).toBe(url);
    });

    it('dovrebbe gestire URL vuoto', () => {
      const resized = service.getResizedUrl('', 640);
      expect(resized).toBe('');
    });

    it('dovrebbe calcolare height automatico con aspect ratio 16:9', () => {
      const url = 'https://picsum.photos/seed/test';
      const resized = service.getResizedUrl(url, 1920);
      
      // 1920 * 9/16 = 1080
      expect(resized).toContain('/1920/1080');
    });
  });

  describe('getResponsiveSizes', () => {
    
    it('dovrebbe generare srcset con widths di default', () => {
      const url = 'https://picsum.photos/seed/test';
      const srcset = service.getResponsiveSizes(url);
      
      expect(srcset).toContain('320w');
      expect(srcset).toContain('640w');
      expect(srcset).toContain('960w');
      expect(srcset).toContain('1280w');
      expect(srcset).toContain('1920w');
    });

    it('dovrebbe generare srcset con widths custom', () => {
      const url = 'https://example.com/image.jpg';
      const srcset = service.getResponsiveSizes(url, [400, 800, 1200]);
      
      expect(srcset).toContain('400w');
      expect(srcset).toContain('800w');
      expect(srcset).toContain('1200w');
      expect(srcset).not.toContain('320w');
    });

    it('dovrebbe separare URLs con virgole', () => {
      const url = 'https://example.com/img.jpg';
      const srcset = service.getResponsiveSizes(url, [100, 200]);
      
      expect(srcset).toContain(', ');
      expect(srcset.split(', ').length).toBe(2);
    });

    it('dovrebbe formattare correttamente ogni entry', () => {
      const url = 'test.jpg';
      const srcset = service.getResponsiveSizes(url, [500]);
      
      expect(srcset).toMatch(/test\.jpg.*500w/);
    });
  });

  describe('isAboveFold', () => {
    
    it('dovrebbe identificare elemento visibile nel viewport', () => {
      const element = document.createElement('div');
      
      // Mock getBoundingClientRect per elemento in viewport
      spyOn(element, 'getBoundingClientRect').and.returnValue({
        top: 100,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

      const result = service.isAboveFold(element);
      
      expect(result).toBe(true);
    });

    it('dovrebbe identificare elemento below-the-fold', () => {
      const element = document.createElement('div');
      
      // Mock getBoundingClientRect per elemento fuori viewport
      const viewportHeight = window.innerHeight || 800;
      spyOn(element, 'getBoundingClientRect').and.returnValue({
        top: viewportHeight + 200, // Oltre il viewport
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

      const result = service.isAboveFold(element);
      
      expect(result).toBe(false);
    });

    it('dovrebbe considerare margine di 100px per prefetch', () => {
      const element = document.createElement('div');
      const viewportHeight = window.innerHeight || 800;
      
      // Elemento appena sotto viewport + 50px (dentro margine)
      spyOn(element, 'getBoundingClientRect').and.returnValue({
        top: viewportHeight + 50,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

      const result = service.isAboveFold(element);
      
      expect(result).toBe(true); // Dentro margine di 100px
    });
  });

  describe('preloadImage', () => {
    
    it('dovrebbe creare link preload element', () => {
      const url = 'https://example.com/important.jpg';
      
      spyOn(document.head, 'appendChild');
      
      service.preloadImage(url);
      
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('dovrebbe configurare link correttamente', () => {
      const url = 'https://example.com/image.jpg';
      let appendedElement: any;
      
      spyOn(document.head, 'appendChild').and.callFake((element: any) => {
        appendedElement = element;
        return element;
      });
      
      service.preloadImage(url);
      
      expect(appendedElement.tagName).toBe('LINK');
      expect(appendedElement.rel).toBe('preload');
      expect(appendedElement.as).toBe('image');
      expect(appendedElement.href).toContain('image.jpg');
    });

    it('dovrebbe gestire URL vuoto gracefully', () => {
      expect(() => {
        service.preloadImage('');
      }).not.toThrow();
    });

    it('NON dovrebbe aggiungere link se URL vuoto', () => {
      spyOn(document.head, 'appendChild');
      
      service.preloadImage('');
      
      expect(document.head.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('getOptimalFormat', () => {
    
    it('dovrebbe ritornare un formato valido', () => {
      const format = service.getOptimalFormat();
      
      expect(['avif', 'webp', 'jpeg']).toContain(format);
    });

    it('dovrebbe preferire AVIF se supportato', () => {
      // Mock canvas con supporto AVIF
      const originalCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'canvas') {
          const canvas = element as HTMLCanvasElement;
          spyOn(canvas, 'toDataURL').and.returnValue('data:image/avif;base64,test');
        }
        return element;
      });

      const format = service.getOptimalFormat();
      
      expect(format).toBe('avif');
    });

    it('dovrebbe fallback a JPEG se nessun formato moderno supportato', () => {
      // Mock canvas senza supporto AVIF/WebP
      const originalCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'canvas') {
          const canvas = element as HTMLCanvasElement;
          spyOn(canvas, 'toDataURL').and.returnValue('data:image/png;base64,test');
        }
        return element;
      });

      const format = service.getOptimalFormat();
      
      expect(format).toBe('jpeg');
    });
  });

  describe('getOptimalDimensions', () => {
    
    it('dovrebbe calcolare dimensioni con DPR = 1', () => {
      spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(1);
      
      const result = service.getOptimalDimensions(800, 600);
      
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('dovrebbe raddoppiare dimensioni con DPR = 2', () => {
      spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(2);
      
      const result = service.getOptimalDimensions(400, 300);
      
      expect(result.width).toBe(800); // 400 * 2
      expect(result.height).toBe(600); // 300 * 2
    });

    it('dovrebbe limitare DPR massimo a 2 (anche se device ha 3)', () => {
      spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(3);
      
      const result = service.getOptimalDimensions(500, 500);
      
      expect(result.width).toBe(1000); // 500 * 2 (non * 3)
      expect(result.height).toBe(1000);
    });

    it('dovrebbe gestire DPR undefined (fallback a 1)', () => {
      spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(undefined as any);
      
      const result = service.getOptimalDimensions(600, 400);
      
      expect(result.width).toBe(600);
      expect(result.height).toBe(400);
    });

    it('dovrebbe arrotondare dimensioni decimali', () => {
      spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(1.5);
      
      const result = service.getOptimalDimensions(100, 100);
      
      // 100 * 1.5 = 150 (arrotondato)
      expect(result.width).toBe(150);
      expect(result.height).toBe(150);
      expect(Number.isInteger(result.width)).toBe(true);
      expect(Number.isInteger(result.height)).toBe(true);
    });

    it('dovrebbe gestire dimensioni zero', () => {
      const result = service.getOptimalDimensions(0, 0);
      
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('dovrebbe gestire dimensioni molto grandi', () => {
      spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(2);
      
      const result = service.getOptimalDimensions(4000, 3000);
      
      expect(result.width).toBe(8000);
      expect(result.height).toBe(6000);
    });
  });

  describe('Integration Tests', () => {
    
    it('dovrebbe generare placeholder e usarlo per preload', () => {
      const placeholder = service.generatePlaceholder(200, 200, '#cccccc');
      
      expect(placeholder).toBeTruthy();
      expect(placeholder.length).toBeGreaterThan(50); // Base64 ha lunghezza minima
    });

    it('dovrebbe calcolare dimensioni ottimali per responsive images', () => {
      spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(2);
      
      const dimensions = service.getOptimalDimensions(320, 240);
      
      expect(dimensions.width).toBe(640);
      expect(dimensions.height).toBe(480);
    });
  });

  describe('Edge Cases', () => {
    
    it('dovrebbe gestire URL Picsum malformato', () => {
      const url = 'https://picsum.photos/malformed';
      const resized = service.getResizedUrl(url, 500);
      
      expect(resized).toContain('picsum.photos');
    });

    it('dovrebbe gestire colori hexadecimal validi', () => {
      expect(() => {
        service.generatePlaceholder(100, 100, '#ffffff');
      }).not.toThrow();
      
      expect(() => {
        service.generatePlaceholder(100, 100, '#000');
      }).not.toThrow();
      
      expect(() => {
        service.generatePlaceholder(100, 100, 'rgb(255,0,0)');
      }).not.toThrow();
    });
  });
});

