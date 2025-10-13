import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgettiCard } from './progetti-card';

describe('ProgettiCard', () => {
  let component: ProgettiCard;
  let fixture: ComponentFixture<ProgettiCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgettiCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProgettiCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
