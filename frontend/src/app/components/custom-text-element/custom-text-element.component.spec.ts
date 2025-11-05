import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
