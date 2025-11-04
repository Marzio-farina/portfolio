import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Contatti } from './contatti';

describe('Contatti', () => {
  let component: Contatti;
  let fixture: ComponentFixture<Contatti>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contatti],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(Contatti);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component State', () => {
    it('component dovrebbe avere properties definite', () => {
      expect(component).toBeDefined();
    });
  });
});
