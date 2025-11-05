import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TechnologiesSelectorComponent } from './technologies-selector.component';
import { TechnologyService } from '../../services/technology.service';
import { of } from 'rxjs';
import { ComponentRef } from '@angular/core';

describe('TechnologiesSelectorComponent', () => {
  let component: TechnologiesSelectorComponent;
  let fixture: ComponentFixture<TechnologiesSelectorComponent>;
  let componentRef: ComponentRef<TechnologiesSelectorComponent>;
  let technologyServiceSpy: jasmine.SpyObj<TechnologyService>;

  const mockTechnologies = [
    { id: 1, title: 'Angular', slug: 'angular' },
    { id: 2, title: 'TypeScript', slug: 'typescript' }
  ];

  beforeEach(async () => {
    technologyServiceSpy = jasmine.createSpyObj('TechnologyService', ['list$']);
    technologyServiceSpy.list$.and.returnValue(of(mockTechnologies));

    await TestBed.configureTestingModule({
      imports: [TechnologiesSelectorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TechnologyService, useValue: technologyServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TechnologiesSelectorComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('selectedIds', []);
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('dovrebbe caricare technologies', () => {
    expect(technologyServiceSpy.list$).toHaveBeenCalled();
  });

  it('isEditMode dovrebbe essere false', () => {
    expect(component.isEditMode()).toBe(false);
  });

  it('dovrebbe accettare isEditMode via input', () => {
    componentRef.setInput('isEditMode', true);
    fixture.detectChanges();
    expect(component.isEditMode()).toBe(true);
  });
});

