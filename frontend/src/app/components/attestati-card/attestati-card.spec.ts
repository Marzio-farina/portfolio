import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttestatiCard } from './attestati-card';

describe('AttestatiCard', () => {
  let component: AttestatiCard;
  let fixture: ComponentFixture<AttestatiCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttestatiCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttestatiCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
