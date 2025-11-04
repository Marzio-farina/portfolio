import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Filter } from './filter';

describe('Filter', () => {
  let component: Filter;
  let fixture: ComponentFixture<Filter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Filter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Filter);
    component = fixture.componentInstance;
    
    // Set required inputs
    fixture.componentRef.setInput('categories', ['Tutti', 'Web', 'Mobile']);
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
