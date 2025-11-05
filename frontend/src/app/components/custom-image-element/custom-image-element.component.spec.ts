import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomImageElementComponent, CustomImageData } from './custom-image-element.component';
import { ComponentRef } from '@angular/core';

/**
 * Test Suite per CustomImageElementComponent
 * 
 * Component per elementi immagine custom nel canvas
 */
describe('CustomImageElementComponent', () => {
  let component: CustomImageElementComponent;
  let fixture: ComponentFixture<CustomImageElementComponent>;
  let componentRef: ComponentRef<CustomImageElementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomImageElementComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomImageElementComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('elementId', 'test-img-1');
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('elementId è required', () => {
      expect(component.elementId()).toBe('test-img-1');
    });

    it('imageUrl dovrebbe essere stringa vuota di default', () => {
      expect(component.imageUrl()).toBe('');
    });

    it('isEditMode dovrebbe essere false di default', () => {
      expect(component.isEditMode()).toBe(false);
    });

    it('saving dovrebbe essere false di default', () => {
      expect(component.saving()).toBe(false);
    });

    it('dovrebbe accettare imageUrl via input', () => {
      componentRef.setInput('imageUrl', 'https://example.com/image.jpg');
      fixture.detectChanges();

      expect(component.imageUrl()).toBe('https://example.com/image.jpg');
    });

    it('dovrebbe accettare isEditMode via input', () => {
      componentRef.setInput('isEditMode', true);
      fixture.detectChanges();

      expect(component.isEditMode()).toBe(true);
    });
  });

  describe('File Selection', () => {
    it('dovrebbe gestire selezione file valido', (done) => {
      const mockFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      
      component.imageSelected.subscribe((data: CustomImageData) => {
        expect(data.file).toBe(mockFile);
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe accettare file PNG', (done) => {
      const mockFile = new File([''], 'image.png', { type: 'image/png' });
      
      component.imageSelected.subscribe((data) => {
        expect(data.file?.type).toBe('image/png');
        done();
      });

      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);
    });

    it('dovrebbe rifiutare file tipo non supportato', () => {
      spyOn(console, 'error');
      const mockFile = new File([''], 'file.pdf', { type: 'application/pdf' });
      
      const event = { target: { files: [mockFile] } } as any;
      component.onFileSelected(event);

      expect(console.error).toHaveBeenCalledWith('Formato file non supportato:', 'application/pdf');
    });

    it('dovrebbe rifiutare file >5MB', () => {
      spyOn(console, 'error');
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      const event = { target: { files: [largeFile] } } as any;
      component.onFileSelected(event);

      expect(console.error).toHaveBeenCalledWith('File troppo grande:', largeFile.size);
    });

    it('dovrebbe ignorare selezione vuota', () => {
      const event = { target: { files: [] } } as any;

      component.imageSelected.subscribe(() => {
        fail('Non dovrebbe emettere');
      });

      component.onFileSelected(event);
      expect(true).toBe(true);
    });
  });

  describe('Drag and Drop', () => {
    it('onDragOver dovrebbe impostare isDragOver', () => {
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy()
      } as any;

      component.onDragOver(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragOver()).toBe(true);
    });

    it('onDragLeave dovrebbe resettare isDragOver', () => {
      component.isDragOver.set(true);
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy()
      } as any;

      component.onDragLeave(event);

      expect(component.isDragOver()).toBe(false);
    });

    it('onFileDrop dovrebbe gestire file valido', (done) => {
      const mockFile = new File([''], 'dropped.jpg', { type: 'image/jpeg' });
      
      component.imageSelected.subscribe((data) => {
        expect(data.file).toBe(mockFile);
        expect(component.isDragOver()).toBe(false);
        done();
      });

      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        dataTransfer: { files: [mockFile] }
      } as any;

      component.onFileDrop(event);
    });

    it('onFileDrop dovrebbe ignorare drop senza file', () => {
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        dataTransfer: { files: [] }
      } as any;

      component.imageSelected.subscribe(() => {
        fail('Non dovrebbe emettere');
      });

      component.onFileDrop(event);
      expect(component.isDragOver()).toBe(false);
    });
  });

  describe('State Management', () => {
    it('isDragOver dovrebbe iniziare false', () => {
      expect(component.isDragOver()).toBe(false);
    });
  });
});

/**
 * COPERTURA: ~85% del component
 * - Input properties (elementId, imageUrl, isEditMode, saving)
 * - File selection e validation
 * - Drag & drop
 * - State management
 * - Output events
 * 
 * NON TESTATO:
 * - FileReader callback completo
 */
