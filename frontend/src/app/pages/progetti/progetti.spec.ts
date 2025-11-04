import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Progetti } from './progetti';

describe('Progetti', () => {
  let component: Progetti;
  let fixture: ComponentFixture<Progetti>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Progetti],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(Progetti);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Signals', () => {
    it('component dovrebbe avere properties definite', () => {
      expect(component.projects).toBeDefined();
      expect(component.loading).toBeDefined();
    });
  });
});
