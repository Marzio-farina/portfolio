import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dovrebbe renderizzare senza errori', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('dovrebbe contenere RouterLink', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('[routerLink]')).toBeTruthy();
  });
});

/**
 * COPERTURA TEST NAVBAR COMPONENT
 * ================================
 * 
 * ✅ Component creation
 * ✅ Template rendering
 * ✅ RouterLink presence
 * 
 * COVERAGE STIMATA: ~80%
 * 
 * NOTA: Navbar è un componente molto semplice (solo template)
 * La logica di routing è gestita da Angular RouterLink
 * 
 * TOTALE: +2 test aggiunti
 */
