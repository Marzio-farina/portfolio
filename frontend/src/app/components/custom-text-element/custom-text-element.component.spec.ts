import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CustomTextElementComponent } from './custom-text-element.component';
import { ComponentRef } from '@angular/core';

describe('CustomTextElementComponent', () => {
  let component: CustomTextElementComponent;
  let fixture: ComponentFixture<CustomTextElementComponent>;
  let componentRef: ComponentRef<CustomTextElementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTextElementComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomTextElementComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('elementId', 'text-1');
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('elementId dovrebbe essere impostato', () => {
    expect(component.elementId()).toBe('text-1');
  });

  it('content dovrebbe essere vuoto di default', () => {
    expect(component.content()).toBe('');
  });

  it('isEditMode dovrebbe essere false', () => {
    expect(component.isEditMode()).toBe(false);
  });

  it('dovrebbe accettare content via input', () => {
    componentRef.setInput('content', 'Test content');
    fixture.detectChanges();
    expect(component.content()).toBe('Test content');
  });

  it('getCurrentContent dovrebbe restituire contenuto', () => {
    const content = component.getCurrentContent();
    expect(content).toBeDefined();
  });

  it('onFocus dovrebbe emettere focused', (done) => {
    component.focused.subscribe(() => {
      expect(true).toBe(true);
      done();
    });
    component.onFocus();
  });

  it('onBlur dovrebbe emettere blurred', (done) => {
    component.blurred.subscribe(() => {
      expect(true).toBe(true);
      done();
    });
    component.onBlur();
  });

  // ========================================
  // TEST: Sanitization
  // ========================================
  describe('HTML Sanitization', () => {
    it('dovrebbe sanitizzare contenuto con tag pericolosi', () => {
      componentRef.setInput('content', '<script>alert("xss")</script>Test');
      fixture.detectChanges();
      const content = component.getCurrentContent();
      expect(content).not.toContain('<script>');
      expect(content).toContain('Test');
    });

    it('dovrebbe mantenere tag di formattazione sicuri (B, I, U)', () => {
      const safeContent = '<b>Bold</b> <i>Italic</i> <u>Underline</u>';
      componentRef.setInput('content', safeContent);
      fixture.detectChanges();
      const content = component.getCurrentContent();
      expect(content).toContain('<b>');
      expect(content).toContain('<i>');
      expect(content).toContain('<u>');
    });

    it('dovrebbe rimuovere attributi pericolosi onclick', () => {
      componentRef.setInput('content', '<span onclick="alert(1)">Click</span>');
      fixture.detectChanges();
      const content = component.getCurrentContent();
      expect(content).not.toContain('onclick');
    });

    it('dovrebbe permettere stile sicuro', () => {
      componentRef.setInput('content', '<span style="color:red;">Red</span>');
      fixture.detectChanges();
      const content = component.getCurrentContent();
      expect(content).toContain('style');
      expect(content).toContain('color');
    });

    it('dovrebbe rimuovere expression pericolose nello style', () => {
      componentRef.setInput('content', '<span style="width:expression(alert(1))">Bad</span>');
      fixture.detectChanges();
      const content = component.getCurrentContent();
      expect(content).not.toContain('expression');
    });

    it('dovrebbe gestire contenuto vuoto', () => {
      componentRef.setInput('content', '');
      fixture.detectChanges();
      const content = component.getCurrentContent();
      expect(content).toBe('');
    });

    it('dovrebbe gestire solo <br> come contenuto vuoto', () => {
      componentRef.setInput('content', '<br>');
      fixture.detectChanges();
      const content = component.getCurrentContent();
      expect(content).toBe('');
    });

    it('dovrebbe convertire DIV in BR', () => {
      componentRef.setInput('content', '<div>Line 1</div><div>Line 2</div>');
      fixture.detectChanges();
      const content = component.getCurrentContent();
      expect(content).toContain('Line 1');
      expect(content).toContain('Line 2');
    });
  });

  // ========================================
  // TEST: Content Change Handling
  // ========================================
  describe('Content Change Handling', () => {
    it('onContentChange dovrebbe aggiornare contenuto locale', () => {
      const mockEvent = {
        target: {
          innerHTML: 'New content'
        }
      } as any;
      
      component.onContentChange(mockEvent);
      const content = component.getCurrentContent();
      expect(content).toContain('New content');
    });

    it('onContentChange dovrebbe sanitizzare contenuto pericoloso', () => {
      const mockEvent = {
        target: {
          innerHTML: '<script>bad</script>Safe'
        }
      } as any;
      
      component.onContentChange(mockEvent);
      const content = component.getCurrentContent();
      expect(content).not.toContain('<script>');
      expect(content).toContain('Safe');
    });
  });

  // ========================================
  // TEST: Keyboard Events
  // ========================================
  describe('Keyboard Events', () => {
    it('onKeyDown con Tab dovrebbe prevenire default', () => {
      const mockEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      spyOn(mockEvent, 'preventDefault');
      
      component.onKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('onKeyDown con altri tasti NON dovrebbe prevenire default', () => {
      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(mockEvent, 'preventDefault');
      
      component.onKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // TEST: Mouse Events
  // ========================================
  describe('Mouse Events', () => {
    it('onEditableMouseDown dovrebbe stopPropagation', () => {
      const mockEvent = new MouseEvent('mousedown');
      spyOn(mockEvent, 'stopPropagation');
      
      component.onEditableMouseDown(mockEvent);
      
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  // ========================================
  // TEST: Focus/Blur Management
  // ========================================
  describe('Focus/Blur Management', () => {
    it('onFocus dovrebbe impostare isFocused a true', () => {
      component.onFocus();
      expect(component['isFocused']()).toBe(true);
    });

    it('onBlur dovrebbe impostare isFocused a false', () => {
      component.onFocus();
      expect(component['isFocused']()).toBe(true);
      
      component.onBlur();
      expect(component['isFocused']()).toBe(false);
    });

    it('onBlur dovrebbe emettere blurred dopo timeout', (done) => {
      component.blurred.subscribe(() => {
        done();
      });
      component.onBlur();
    });
  });

  // ========================================
  // TEST: Lifecycle Hooks
  // ========================================
  describe('Lifecycle Hooks', () => {
    it('ngAfterViewInit dovrebbe essere chiamato', fakeAsync(() => {
      const updateContentSpy = spyOn<any>(component, 'updateContent');
      component.ngAfterViewInit();
      
      tick(10);
      expect(updateContentSpy).toHaveBeenCalled();
    }));

    it('ngAfterViewChecked dovrebbe sincronizzare contenuto in edit mode', () => {
      componentRef.setInput('isEditMode', true);
      fixture.detectChanges();
      
      component.ngAfterViewChecked();
      
      expect(component['contentSynced']).toBeDefined();
    });
  });

  // ========================================
  // TEST: Input Properties
  // ========================================
  describe('Input Properties', () => {
    it('textStyle dovrebbe essere impostabile', () => {
      const style = { fontFamily: 'Arial', fontSize: 16 };
      componentRef.setInput('textStyle', style);
      fixture.detectChanges();
      
      expect(component.textStyle()).toEqual(style);
    });

    it('saving dovrebbe essere impostabile', () => {
      componentRef.setInput('saving', true);
      fixture.detectChanges();
      
      expect(component.saving()).toBe(true);
    });

    it('isEditMode dovrebbe reagire ai cambiamenti', () => {
      componentRef.setInput('isEditMode', false);
      fixture.detectChanges();
      expect(component.isEditMode()).toBe(false);
      
      componentRef.setInput('isEditMode', true);
      fixture.detectChanges();
      expect(component.isEditMode()).toBe(true);
    });
  });

  // ========================================
  // TEST: Content Synchronization
  // ========================================
  describe('Content Synchronization', () => {
    it('dovrebbe sincronizzare contenuto da input', () => {
      const newContent = '<b>Synced content</b>';
      componentRef.setInput('content', newContent);
      fixture.detectChanges();
      
      expect(component.content()).toContain('Synced content');
    });

    it('dovrebbe preservare contenuto locale durante focus', () => {
      component.onFocus();
      
      const mockEvent = {
        target: {
          innerHTML: 'User typing...'
        }
      } as any;
      component.onContentChange(mockEvent);
      
      // Cambia content dall'esterno mentre user scrive
      componentRef.setInput('content', 'External change');
      fixture.detectChanges();
      
      // Il contenuto locale dell'utente dovrebbe essere preservato
      const current = component.getCurrentContent();
      expect(current).toContain('User typing');
    });
  });

  // ========================================
  // TEST: getCurrentContent
  // ========================================
  describe('getCurrentContent()', () => {
    it('dovrebbe ritornare contenuto corrente', fakeAsync(() => {
      componentRef.setInput('content', 'Test content');
      componentRef.setInput('isEditMode', true);
      fixture.detectChanges();
      tick(10); // Aspetta che ngAfterViewInit completi
      fixture.detectChanges();
      
      const content = component.getCurrentContent();
      expect(content).toBeTruthy();
    }));

    it('dovrebbe ritornare stringa vuota per contenuto solo <br>', () => {
      componentRef.setInput('content', '<br>');
      fixture.detectChanges();
      
      const content = component.getCurrentContent();
      expect(content).toBe('');
    });

    it('dovrebbe ritornare stringa vuota per whitespace', () => {
      componentRef.setInput('content', '   ');
      fixture.detectChanges();
      
      const content = component.getCurrentContent();
      expect(content).toBe('');
    });

    it('dovrebbe sanitizzare contenuto prima di ritornarlo', () => {
      const mockEvent = {
        target: {
          innerHTML: '<script>alert(1)</script>Safe'
        }
      } as any;
      component.onContentChange(mockEvent);
      
      const content = component.getCurrentContent();
      expect(content).not.toContain('<script>');
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire cambio rapido di edit mode', () => {
      for (let i = 0; i < 5; i++) {
        componentRef.setInput('isEditMode', true);
        fixture.detectChanges();
        componentRef.setInput('isEditMode', false);
        fixture.detectChanges();
      }
      
      expect(component).toBeTruthy();
    });

    it('dovrebbe gestire contenuto molto lungo', () => {
      const longContent = 'A'.repeat(10000);
      componentRef.setInput('content', longContent);
      fixture.detectChanges();
      
      expect(component.content().length).toBe(10000);
    });

    it('dovrebbe gestire caratteri speciali', () => {
      const specialChars = '<>&"\'';
      componentRef.setInput('content', specialChars);
      fixture.detectChanges();
      
      expect(component).toBeTruthy();
    });

    it('dovrebbe gestire HTML malformato', () => {
      const malformed = '<b>Unclosed bold<i>Unclosed italic';
      componentRef.setInput('content', malformed);
      fixture.detectChanges();
      
      expect(component).toBeTruthy();
    });

    it('dovrebbe gestire mix di tag permessi e pericolosi', fakeAsync(() => {
      const mixed = '<b>Safe</b><script>bad</script><i>Also safe</i>';
      componentRef.setInput('content', mixed);
      componentRef.setInput('isEditMode', true);
      fixture.detectChanges();
      tick(10); // Aspetta che ngAfterViewInit completi
      fixture.detectChanges();
      
      const content = component.getCurrentContent();
      expect(content).toContain('<b>');
      expect(content).toContain('<i>');
      expect(content).not.toContain('<script>');
    }));
  });

  // ========================================
  // TEST: Complex Workflows
  // ========================================
  describe('Complex Workflows', () => {
    it('workflow: focus → type → blur → get content', (done) => {
      component.onFocus();
      
      const mockEvent = {
        target: {
          innerHTML: '<b>User content</b>'
        }
      } as any;
      component.onContentChange(mockEvent);
      
      component.onBlur();
      
      setTimeout(() => {
        const content = component.getCurrentContent();
        expect(content).toContain('User content');
        expect(content).toContain('<b>');
        done();
      }, 350);
    });

    it('workflow: edit mode on → type → edit mode off', () => {
      componentRef.setInput('isEditMode', true);
      fixture.detectChanges();
      
      const mockEvent = {
        target: {
          innerHTML: 'Edited'
        }
      } as any;
      component.onContentChange(mockEvent);
      
      componentRef.setInput('isEditMode', false);
      fixture.detectChanges();
      
      expect(component.isEditMode()).toBe(false);
    });

    it('workflow: saving state changes', () => {
      componentRef.setInput('saving', false);
      fixture.detectChanges();
      expect(component.saving()).toBe(false);
      
      componentRef.setInput('saving', true);
      fixture.detectChanges();
      expect(component.saving()).toBe(true);
      
      componentRef.setInput('saving', false);
      fixture.detectChanges();
      expect(component.saving()).toBe(false);
    });
  });
});
