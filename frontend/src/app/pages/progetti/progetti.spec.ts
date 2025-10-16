import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Progetti } from './progetti';

describe('Progetti', () => {
  let component: Progetti;
  let fixture: ComponentFixture<Progetti>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Progetti]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Progetti);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
