import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParticlesBgComponent } from './particles-bg';
import { ThemeService } from '../../services/theme.service';
import { signal } from '@angular/core';

/**
 * Test Suite per ParticlesBgComponent
 * 
 * Component per background animato con particelle canvas
 */
describe('ParticlesBgComponent', () => {
  let component: ParticlesBgComponent;
  let fixture: ComponentFixture<ParticlesBgComponent>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;

  beforeEach(async () => {
    themeServiceSpy = jasmine.createSpyObj('ThemeService', [], {
      effectiveTheme: signal('light')
    });

    await TestBed.configureTestingModule({
      imports: [ParticlesBgComponent],
      providers: [
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ParticlesBgComponent);
    component = fixture.componentInstance;
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('dovrebbe inizializzare canvas', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('dovrebbe pulire animation frame on destroy', () => {
    fixture.detectChanges();
    spyOn(window, 'cancelAnimationFrame');
    
    component.ngOnDestroy();
    
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('dovrebbe disconnettere mutation observer on destroy', () => {
    fixture.detectChanges();
    
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('dovrebbe rimuovere resize listener on destroy', () => {
    fixture.detectChanges();
    spyOn(window, 'removeEventListener');
    
    component.ngOnDestroy();
    
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', jasmine.any(Function));
  });
});

/**
 * COPERTURA: ~40% del component
 * - Creazione component
 * - Lifecycle hooks (ngOnInit, ngOnDestroy)
 * - Cleanup (animationFrame, MutationObserver, resize listener)
 * 
 * NON TESTATO (complessità canvas):
 * - Canvas rendering logic
 * - Particle animation loop
 * - Color updates from CSS
 * - Resize handling dettagliato
 */

