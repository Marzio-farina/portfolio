import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Attestati } from './attestati';

describe('Attestati', () => {
  let component: Attestati;
  let fixture: ComponentFixture<Attestati>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Attestati]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Attestati);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
