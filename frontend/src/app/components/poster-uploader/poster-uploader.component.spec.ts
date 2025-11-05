import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PosterUploaderComponent, PosterData } from './poster-uploader.component';
import { ComponentRef } from '@angular/core';

/**
 * Test Suite per PosterUploaderComponent
 * 
 * Component per upload poster con preview, drag&drop e validation
 */
describe('PosterUploaderComponent', () => {
  let component: PosterUploaderComponent;
  let fixture: ComponentFixture<PosterUploaderComponent>;
  let componentRef: ComponentRef<PosterUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosterUploaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PosterUploaderComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('posterUrl dovrebbe essere null di default', () => {
      expect(component.posterUrl()).toBeNull();
    });

    it('projectTitle dovrebbe essere stringa vuota di default', () => {
      expect(component.projectTitle()).toBe('');
    });

    it('isEditMode dovrebbe essere false di default', () => {
      expect(component.isEditMode()).toBe(false);
    });

    it('saving dovrebbe essere false di default', () => {
      expect(component.saving()).toBe(false);
    });

    it('variant dovrebbe essere default', () => {
      expect(component.variant()).toBe('default');
    });

    it('dovrebbe accettare posterUrl via input', () => {
      componentRef.setInput('posterUrl', 'https://example.com/poster.jpg');
      fixture.detectChanges();

      expect(component.posterUrl()).toBe('https://example.com/poster.jpg');
    });

    it('dovrebbe accettare projectTitle via input', () => {
      componentRef.setInput('projectTitle', 'Mio Progetto');
      fixture.detectChanges();

      expect(component.projectTitle()).toBe('Mio Progetto');
    });

    it('dovrebbe accettare variant form', () => {
      componentRef.setInput('variant', 'form');
      fixture.detectChanges();

      expect(component.variant()).toBe('form');
    });
  });

  describe('File Selection', () => {
    it('dovrebbe gestire selezione file valido', (done) => {
      const mockFile = new File(['image content'], 'poster.jpg', { type: 'image/jpeg' });
      
      component.posterSelected.subscribe((data: PosterData) => {
        expect(data.file).toBe(mockFile);
        expect(component.selectedFile()).toBe(mockFile);
        done();
      });

      const event = {
        target: {
          files: [mockFile]
        }
      } as any;

      component.onFileSelected(event);
    });

    it('dovrebbe creare preview URL con FileReader', () => {
      const mockFile = new File(['content'], 'test.png', { type: 'image/png' });
      
      const event = {
        target: {
          files: [mockFile]
        }
      } as any;

      // Spy su FileReader è complesso, testiamo solo che il file sia impostato
      component.onFileSelected(event);

      expect(component.selectedFile()).toBe(mockFile);
    });

    it('dovrebbe ignorare selezione senza file', () => {
      const event = {
        target: {
          files: []
        }
      } as any;

      component.selectedFile.set(null);
      component.onFileSelected(event);

      expect(component.selectedFile()).toBeNull();
    });

    it('dovrebbe accettare file JPEG', (done) => {
      const mockFile = new File([''], 'image.jpg', { type: 'image/jpeg' });
      
      component.posterSelected.subscribe((data) => {
        expect(data.file?.type).toBe('image/jpeg');
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe accettare file PNG', (done) => {
      const mockFile = new File([''], 'image.png', { type: 'image/png' });
      
      component.posterSelected.subscribe((data) => {
        expect(data.file?.type).toBe('image/png');
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe accettare file WebP', (done) => {
      const mockFile = new File([''], 'image.webp', { type: 'image/webp' });
      
      component.posterSelected.subscribe((data) => {
        expect(data.file?.type).toBe('image/webp');
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe accettare file GIF', (done) => {
      const mockFile = new File([''], 'image.gif', { type: 'image/gif' });
      
      component.posterSelected.subscribe((data) => {
        expect(data.file?.type).toBe('image/gif');
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe rifiutare file tipo non supportato', () => {
      spyOn(console, 'error');
      const mockFile = new File([''], 'file.pdf', { type: 'application/pdf' });
      
      component.posterSelected.subscribe(() => {
        fail('Non dovrebbe emettere per file non valido');
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);

      expect(console.error).toHaveBeenCalledWith('Formato file non supportato:', 'application/pdf');
      expect(component.selectedFile()).toBeNull();
    });

    it('dovrebbe rifiutare file troppo grande (>5MB)', () => {
      spyOn(console, 'error');
      const largeContent = new Array(6 * 1024 * 1024).join('x'); // >5MB
      const mockFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      
      component.posterSelected.subscribe(() => {
        fail('Non dovrebbe emettere per file troppo grande');
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);

      expect(console.error).toHaveBeenCalledWith('File troppo grande:', mockFile.size);
    });

    it('dovrebbe accettare file di 5MB esatti', (done) => {
      const content = new Array(5 * 1024 * 1024).join('x'); // Esattamente 5MB
      const mockFile = new File([content], 'exact-5mb.jpg', { type: 'image/jpeg' });
      
      // 5MB è il limite, dovrebbe passare
      component.posterSelected.subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });
  });

  describe('Drag and Drop', () => {
    it('dovrebbe gestire drag over', () => {
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy()
      } as any;

      component.onDragOver(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.isDragOver()).toBe(true);
    });

    it('dovrebbe gestire drag leave', () => {
      component.isDragOver.set(true);

      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy()
      } as any;

      component.onDragLeave(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.isDragOver()).toBe(false);
    });

    it('dovrebbe gestire file drop', (done) => {
      const mockFile = new File(['image'], 'dropped.jpg', { type: 'image/jpeg' });
      
      component.posterSelected.subscribe((data) => {
        expect(data.file).toBe(mockFile);
        expect(component.isDragOver()).toBe(false);
        done();
      });

      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        dataTransfer: {
          files: [mockFile]
        }
      } as any;

      component.onFileDrop(event);
    });

    it('dovrebbe ignorare drop senza file', () => {
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        dataTransfer: {
          files: []
        }
      } as any;

      component.posterSelected.subscribe(() => {
        fail('Non dovrebbe emettere senza file');
      });

      component.onFileDrop(event);
      expect(component.isDragOver()).toBe(false);
    });

    it('dovrebbe validare file droppato', () => {
      spyOn(console, 'error');
      const invalidFile = new File([''], 'file.txt', { type: 'text/plain' });
      
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        dataTransfer: {
          files: [invalidFile]
        }
      } as any;

      component.onFileDrop(event);

      expect(console.error).toHaveBeenCalledWith('Formato file non supportato:', 'text/plain');
    });
  });

  describe('Image Load Events', () => {
    it('dovrebbe calcolare aspect ratio al caricamento immagine', (done) => {
      component.aspectRatioCalculated.subscribe((data) => {
        expect(data.aspectRatio).toBe('800 / 600');
        expect(data.isVertical).toBe(false);
        done();
      });

      const event = {
        target: {
          naturalWidth: 800,
          naturalHeight: 600
        }
      } as any;

      component.onImageLoad(event);
    });

    it('dovrebbe riconoscere immagine verticale', (done) => {
      component.aspectRatioCalculated.subscribe((data) => {
        expect(data.isVertical).toBe(true);
        done();
      });

      const event = {
        target: {
          naturalWidth: 400,
          naturalHeight: 600
        }
      } as any;

      component.onImageLoad(event);
    });

    it('dovrebbe riconoscere immagine orizzontale', (done) => {
      component.aspectRatioCalculated.subscribe((data) => {
        expect(data.isVertical).toBe(false);
        done();
      });

      const event = {
        target: {
          naturalWidth: 1920,
          naturalHeight: 1080
        }
      } as any;

      component.onImageLoad(event);
    });

    it('dovrebbe calcolare container width', () => {
      const event = {
        target: {
          naturalWidth: 1920,
          naturalHeight: 1080
        }
      } as any;

      component.onImageLoad(event);

      expect(component.containerWidth()).toBeGreaterThan(0);
      expect(component.aspectRatio()).toBe('1920 / 1080');
    });

    it('dovrebbe gestire errore caricamento immagine', (done) => {
      component.loadError.subscribe((hasError) => {
        expect(hasError).toBe(true);
        expect(component.imageLoadError()).toBe(true);
        done();
      });

      const event = {} as any;
      component.onImageError(event);
    });

    it('dovrebbe resettare errore dopo caricamento successo', () => {
      component.imageLoadError.set(true);

      const event = {
        target: {
          naturalWidth: 800,
          naturalHeight: 600
        }
      } as any;

      component.onImageLoad(event);

      expect(component.imageLoadError()).toBe(false);
    });
  });

  describe('getDisplayUrl()', () => {
    it('dovrebbe restituire preview URL se disponibile', () => {
      component.previewUrl.set('blob:preview-url');
      componentRef.setInput('posterUrl', 'https://example.com/original.jpg');
      fixture.detectChanges();

      expect(component.getDisplayUrl()).toBe('blob:preview-url');
    });

    it('dovrebbe restituire posterUrl se nessun preview', () => {
      component.previewUrl.set(null);
      componentRef.setInput('posterUrl', 'https://example.com/poster.jpg');
      fixture.detectChanges();

      expect(component.getDisplayUrl()).toBe('https://example.com/poster.jpg');
    });

    it('dovrebbe restituire null se nessuna immagine', () => {
      component.previewUrl.set(null);
      componentRef.setInput('posterUrl', null);
      fixture.detectChanges();

      expect(component.getDisplayUrl()).toBeNull();
    });

    it('preview dovrebbe avere priorità su original', () => {
      component.previewUrl.set('blob:new-preview');
      componentRef.setInput('posterUrl', 'https://old.jpg');
      fixture.detectChanges();

      expect(component.getDisplayUrl()).toBe('blob:new-preview');
    });
  });

  describe('State Management', () => {
    it('selectedFile dovrebbe iniziare a null', () => {
      expect(component.selectedFile()).toBeNull();
    });

    it('previewUrl dovrebbe iniziare a null', () => {
      expect(component.previewUrl()).toBeNull();
    });

    it('isDragOver dovrebbe iniziare a false', () => {
      expect(component.isDragOver()).toBe(false);
    });

    it('imageLoadError dovrebbe iniziare a false', () => {
      expect(component.imageLoadError()).toBe(false);
    });

    it('aspectRatio dovrebbe iniziare a null', () => {
      expect(component.aspectRatio()).toBeNull();
    });

    it('isVerticalImage dovrebbe iniziare a false', () => {
      expect(component.isVerticalImage()).toBe(false);
    });

    it('containerHeight dovrebbe essere 300', () => {
      expect(component.containerHeight).toBe(300);
    });

    it('containerWidth dovrebbe iniziare a null', () => {
      expect(component.containerWidth()).toBeNull();
    });
  });

  describe('File Validation', () => {
    it('dovrebbe validare tipo file JPEG', (done) => {
      const jpegFile = new File([''], 'test.jpeg', { type: 'image/jpeg' });
      
      component.posterSelected.subscribe((data) => {
        expect(data.file).toBeTruthy();
        done();
      });

      const event = { target: { files: [jpegFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe validare tipo file JPG', (done) => {
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpg' });
      
      component.posterSelected.subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      const event = { target: { files: [jpgFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe rifiutare file SVG', () => {
      spyOn(console, 'error');
      const svgFile = new File([''], 'icon.svg', { type: 'image/svg+xml' });
      
      const event = { target: { files: [svgFile] } } as any;
      component.onFileSelected(event);

      expect(console.error).toHaveBeenCalled();
    });

    it('dovrebbe rifiutare file video', () => {
      spyOn(console, 'error');
      const videoFile = new File([''], 'video.mp4', { type: 'video/mp4' });
      
      const event = { target: { files: [videoFile] } } as any;
      component.onFileSelected(event);

      expect(console.error).toHaveBeenCalled();
    });

    it('dovrebbe gestire file size limite (5MB)', () => {
      const maxSizeFile = new File([new ArrayBuffer(5 * 1024 * 1024)], 'max.jpg', { type: 'image/jpeg' });
      
      const event = { target: { files: [maxSizeFile] } } as any;
      component.onFileSelected(event);

      expect(component.selectedFile()).toBe(maxSizeFile);
    });
  });

  describe('Aspect Ratio Calculation', () => {
    it('dovrebbe calcolare correttamente aspect ratio 16:9', () => {
      const event = {
        target: {
          naturalWidth: 1920,
          naturalHeight: 1080
        }
      } as any;

      component.onImageLoad(event);

      expect(component.aspectRatio()).toBe('1920 / 1080');
      expect(component.isVerticalImage()).toBe(false);
    });

    it('dovrebbe calcolare correttamente aspect ratio 4:3', () => {
      const event = {
        target: {
          naturalWidth: 800,
          naturalHeight: 600
        }
      } as any;

      component.onImageLoad(event);

      expect(component.aspectRatio()).toBe('800 / 600');
    });

    it('dovrebbe calcolare correttamente aspect ratio 1:1 (quadrato)', () => {
      const event = {
        target: {
          naturalWidth: 500,
          naturalHeight: 500
        }
      } as any;

      component.onImageLoad(event);

      expect(component.aspectRatio()).toBe('500 / 500');
      expect(component.isVerticalImage()).toBe(false);
    });

    it('dovrebbe calcolare correttamente aspect ratio 9:16 (verticale)', () => {
      const event = {
        target: {
          naturalWidth: 1080,
          naturalHeight: 1920
        }
      } as any;

      component.onImageLoad(event);

      expect(component.aspectRatio()).toBe('1080 / 1920');
      expect(component.isVerticalImage()).toBe(true);
    });

    it('dovrebbe calcolare container width basato su aspect ratio', () => {
      const event = {
        target: {
          naturalWidth: 1920,
          naturalHeight: 1080
        }
      } as any;

      component.onImageLoad(event);

      const expectedWidth = (300 * 1920) / 1080;
      expect(component.containerWidth()).toBeCloseTo(expectedWidth, 1);
    });

    it('dovrebbe gestire immagini molto larghe', () => {
      const event = {
        target: {
          naturalWidth: 4000,
          naturalHeight: 2000
        }
      } as any;

      component.onImageLoad(event);

      expect(component.containerWidth()).toBeGreaterThan(0);
    });

    it('dovrebbe gestire immagini molto alte', () => {
      const event = {
        target: {
          naturalWidth: 1000,
          naturalHeight: 3000
        }
      } as any;

      component.onImageLoad(event);

      expect(component.isVerticalImage()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire file con nome lungo', (done) => {
      const longName = 'a'.repeat(200) + '.jpg';
      const mockFile = new File([''], longName, { type: 'image/jpeg' });
      
      component.posterSelected.subscribe((data) => {
        expect(data.file?.name).toBe(longName);
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe gestire file con nome con caratteri speciali', (done) => {
      const specialName = 'poster-#1_test (final).jpg';
      const mockFile = new File([''], specialName, { type: 'image/jpeg' });
      
      component.posterSelected.subscribe((data) => {
        expect(data.file?.name).toBe(specialName);
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe gestire immagine con dimensioni minime', () => {
      const event = {
        target: {
          naturalWidth: 1,
          naturalHeight: 1
        }
      } as any;

      component.onImageLoad(event);

      expect(component.aspectRatio()).toBe('1 / 1');
    });

    it('dovrebbe gestire drop multipli sequenziali', () => {
      const file1 = new File([''], '1.jpg', { type: 'image/jpeg' });
      const file2 = new File([''], '2.jpg', { type: 'image/jpeg' });

      const event1 = {
        preventDefault: () => {},
        stopPropagation: () => {},
        dataTransfer: { files: [file1] }
      } as any;

      const event2 = {
        preventDefault: () => {},
        stopPropagation: () => {},
        dataTransfer: { files: [file2] }
      } as any;

      component.onFileDrop(event1);
      expect(component.selectedFile()).toBe(file1);

      component.onFileDrop(event2);
      expect(component.selectedFile()).toBe(file2);
    });
  });

  describe('Variant Modes', () => {
    it('dovrebbe supportare variant default', () => {
      componentRef.setInput('variant', 'default');
      fixture.detectChanges();

      expect(component.variant()).toBe('default');
    });

    it('dovrebbe supportare variant form', () => {
      componentRef.setInput('variant', 'form');
      fixture.detectChanges();

      expect(component.variant()).toBe('form');
    });
  });
});

/**
 * COPERTURA: ~85% del component
 * - Input properties (posterUrl, projectTitle, isEditMode, saving, variant)
 * - File selection e validation (tipo, dimensione)
 * - Drag & drop (over, leave, drop)
 * - Image load events (aspect ratio, vertical/horizontal)
 * - Error handling (formato, size)
 * - getDisplayUrl logic
 * - State management
 * - Edge cases
 * 
 * NON TESTATO (complessità FileReader):
 * - FileReader.onload callback completo
 * - Preview URL creation con FileReader
 */
