import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestimonialCarouselCard } from './testimonial-carousel-card';

describe('TestimonialCarouselCard', () => {
  let component: TestimonialCarouselCard;
  let fixture: ComponentFixture<TestimonialCarouselCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestimonialCarouselCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestimonialCarouselCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

