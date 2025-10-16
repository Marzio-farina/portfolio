import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Maps } from './maps';

describe('Maps', () => {
  let component: Maps;
  let fixture: ComponentFixture<Maps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Maps]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Maps);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
