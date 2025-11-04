import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Aside } from './aside';

describe('Aside', () => {
  let component: Aside;
  let fixture: ComponentFixture<Aside>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Aside],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(Aside);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Signals', () => {
    it('profile signal dovrebbe essere definito', () => {
      expect(component.profile).toBeDefined();
    });

    it('loading signal dovrebbe essere definito', () => {
      expect(component.loading).toBeDefined();
    });
  });

  describe('Profile Data', () => {
    it('profile dovrebbe gestire dati', () => {
      const mock: any = { id: 1, name: 'Test', email: 'test@test.com' };
      component.profile.set(mock);
      expect(component.profile()?.name).toBe('Test');
    });

    it('profile dovrebbe gestire null', () => {
      component.profile.set(null);
      expect(component.profile()).toBe(null);
    });
  });
});
