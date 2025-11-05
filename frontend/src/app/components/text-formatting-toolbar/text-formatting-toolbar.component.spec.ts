import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextFormattingToolbarComponent, TextStyle } from './text-formatting-toolbar.component';
import { ComponentRef } from '@angular/core';

describe('TextFormattingToolbarComponent', () => {
  let component: TextFormattingToolbarComponent;
  let fixture: ComponentFixture<TextFormattingToolbarComponent>;
  let componentRef: ComponentRef<TextFormattingToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextFormattingToolbarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TextFormattingToolbarComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('currentStyle dovrebbe essere oggetto vuoto', () => {
    expect(component.currentStyle()).toEqual({});
  });

  it('isDeviceSpecific dovrebbe essere false', () => {
    expect(component.isDeviceSpecific()).toBe(false);
  });

  it('showColorPicker dovrebbe iniziare false', () => {
    expect(component.showColorPicker()).toBe(false);
  });

  it('toggleColorPicker dovrebbe aprire/chiudere', () => {
    component.toggleColorPicker();
    expect(component.showColorPicker()).toBe(true);
    
    component.toggleColorPicker();
    expect(component.showColorPicker()).toBe(false);
  });

  it('closeColorPicker dovrebbe chiudere', () => {
    component.showColorPicker.set(true);
    component.closeColorPicker();
    expect(component.showColorPicker()).toBe(false);
  });

  it('toggleDeviceSpecific dovrebbe emettere evento', (done) => {
    componentRef.setInput('isDeviceSpecific', false);
    
    component.deviceSpecificToggled.subscribe((value) => {
      expect(value).toBe(true);
      done();
    });
    
    component.toggleDeviceSpecific();
  });

  it('isBold dovrebbe restituire stato', () => {
    expect(typeof component.isBold()).toBe('boolean');
  });

  it('isItalic dovrebbe restituire stato', () => {
    expect(typeof component.isItalic()).toBe('boolean');
  });

  it('isUnderline dovrebbe restituire stato', () => {
    expect(typeof component.isUnderline()).toBe('boolean');
  });

  it('isStrikethrough dovrebbe restituire stato', () => {
    expect(typeof component.isStrikethrough()).toBe('boolean');
  });

  it('getCurrentColor dovrebbe restituire colore', () => {
    expect(component.getCurrentColor()).toBeTruthy();
  });

  it('changeColor dovrebbe chiudere popup se richiesto', () => {
    component.showColorPicker.set(true);
    component.changeColor('#ff0000', true);
    expect(component.showColorPicker()).toBe(false);
  });

  it('changeColor non dovrebbe chiudere popup se non richiesto', () => {
    component.showColorPicker.set(true);
    component.changeColor('#00ff00', false);
    expect(component.showColorPicker()).toBe(true);
  });
});

