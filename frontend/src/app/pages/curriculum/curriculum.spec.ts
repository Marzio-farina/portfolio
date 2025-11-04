import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Curriculum } from './curriculum';

describe('Curriculum', () => {
  let component: Curriculum;
  let fixture: ComponentFixture<Curriculum>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Curriculum],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(Curriculum);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Signals', () => {
    it('education signal dovrebbe essere definito', () => {
      expect(component.education).toBeDefined();
    });

    it('experience signal dovrebbe essere definito', () => {
      expect(component.experience).toBeDefined();
    });

    it('loading signal dovrebbe essere definito', () => {
      expect(component.loading).toBeDefined();
    });
  });

  describe('CV Data', () => {
    it('education dovrebbe gestire array vuoto', () => {
      component.education.set([]);
      expect(component.education().length).toBe(0);
    });

    it('education dovrebbe gestire array con elementi', () => {
      const mockEducation = [
        { title: 'Laurea', years: '2015-2019', description: 'Computer Science' },
        { title: 'Master', years: '2019-2021', description: 'Software Eng' }
      ];
      
      component.education.set(mockEducation);
      expect(component.education().length).toBe(2);
    });

    it('experience dovrebbe gestire array vuoto', () => {
      component.experience.set([]);
      expect(component.experience().length).toBe(0);
    });

    it('experience dovrebbe gestire array con elementi', () => {
      const mockExperience = [
        { title: 'Developer', years: '2021-2023', description: 'Full Stack' }
      ];
      
      component.experience.set(mockExperience);
      expect(component.experience().length).toBe(1);
    });
  });

  describe('Loading State', () => {
    it('loading dovrebbe poter essere modificato', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);
      
      component.loading.set(false);
      expect(component.loading()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire education e experience contemporaneamente', () => {
      component.education.set([{ title: 'Ed1', years: '2020', description: 'Desc' }]);
      component.experience.set([{ title: 'Exp1', years: '2021', description: 'Desc' }]);
      
      expect(component.education().length).toBe(1);
      expect(component.experience().length).toBe(1);
    });

    it('dovrebbe gestire timeline items con description vuota', () => {
      component.education.set([{ title: 'Test', years: '2020', description: '' }]);
      
      expect(component.education()[0].description).toBe('');
    });
  });
});
