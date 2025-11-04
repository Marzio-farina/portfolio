import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelineItem } from './timeline-item';

describe('TimelineItem', () => {
  let component: TimelineItem;
  let fixture: ComponentFixture<TimelineItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimelineItem);
    component = fixture.componentInstance;
    
    // Set required inputs
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('years', '2020-2023');
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
