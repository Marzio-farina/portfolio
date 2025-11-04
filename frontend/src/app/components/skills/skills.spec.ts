import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Skills } from './skills';

describe('Skills', () => {
  let component: Skills;
  let fixture: ComponentFixture<Skills>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Skills]
    }).compileComponents();

    fixture = TestBed.createComponent(Skills);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('dovrebbe creare', () => {
    expect(component).toBeTruthy();
  });

  describe('Skills Data', () => {
    it('skills signal dovrebbe essere definito', () => {
      expect(component.skills).toBeDefined();
    });

    it('dovrebbe gestire array skills', () => {
      const mock: any[] = [
        { name: 'Angular', icon: 'angular.svg' },
        { name: 'TypeScript', icon: 'ts.svg' }
      ];
      component.skills.set(mock);
      expect(component.skills().length).toBe(2);
    });

    it('dovrebbe gestire skills vuoto', () => {
      component.skills.set([]);
      expect(component.skills().length).toBe(0);
    });
  });

});


