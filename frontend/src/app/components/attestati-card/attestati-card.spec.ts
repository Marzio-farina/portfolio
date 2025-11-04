import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { AttestatiCard } from './attestati-card';

describe('AttestatiCard', () => {
  let component: AttestatiCard;
  let fixture: ComponentFixture<AttestatiCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttestatiCard],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttestatiCard);
    component = fixture.componentInstance;
    
    // Set required inputs
    fixture.componentRef.setInput('attestato', {
      id: 1,
      title: 'Test Attestato',
      institution: 'Test Institution',
      image: 'test.jpg',
      issue_date: '2023-01-01'
    });
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
