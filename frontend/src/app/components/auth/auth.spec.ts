import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Auth } from './auth';

describe('Auth', () => {
  let component: Auth;
  let fixture: ComponentFixture<Auth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(Auth);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Forms', () => {
    it('loginForm dovrebbe essere definito', () => {
      expect(component.loginForm).toBeDefined();
    });

    it('registerForm dovrebbe essere definito', () => {
      expect(component.registerForm).toBeDefined();
    });

    it('recoverForm dovrebbe essere definito', () => {
      expect(component.recoverForm).toBeDefined();
    });
  });

  describe('Signals', () => {
    it('loading signal dovrebbe esistere', () => {
      expect(component.loading).toBeDefined();
    });

    it('loading dovrebbe essere modificabile', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);
    });
  });
});
