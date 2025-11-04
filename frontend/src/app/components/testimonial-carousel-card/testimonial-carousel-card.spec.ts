import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { TestimonialCarouselCard } from './testimonial-carousel-card';

describe('TestimonialCarouselCard', () => {
  let component: TestimonialCarouselCard;
  let fixture: ComponentFixture<TestimonialCarouselCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestimonialCarouselCard],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestimonialCarouselCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Signals', () => {
    it('testimonials signal dovrebbe essere definito', () => {
      expect(component.testimonials).toBeDefined();
    });

    it('currentSlide signal dovrebbe essere definito', () => {
      expect(component.currentSlide).toBeDefined();
    });
  });

  describe('Testimonials Management', () => {
    it('testimonials dovrebbe gestire array vuoto', () => {
      component.testimonials.set([]);
      expect(component.testimonials().length).toBe(0);
    });

    it('testimonials dovrebbe gestire array con elementi', () => {
      const mock: any[] = [
        { id: 1, author_name: 'Test 1', text: 'Text 1', rating: 5, avatar_url: 'a1.jpg' },
        { id: 2, author_name: 'Test 2', text: 'Text 2', rating: 4, avatar_url: 'a2.jpg' }
      ];
      
      component.testimonials.set(mock);
      expect(component.testimonials().length).toBe(2);
    });
  });

  describe('Slide Management', () => {
    it('currentSlide dovrebbe gestire valore', () => {
      component.currentSlide.set(2);
      expect(component.currentSlide()).toBe(2);
    });

    it('currentSlide dovrebbe gestire valore 0', () => {
      component.currentSlide.set(0);
      expect(component.currentSlide()).toBe(0);
    });
  });
});
