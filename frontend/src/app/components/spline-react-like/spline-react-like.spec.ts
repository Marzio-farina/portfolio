import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplineReactLike } from './spline-react-like';

describe('SplineReactLike', () => {
  let component: SplineReactLike;
  let fixture: ComponentFixture<SplineReactLike>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplineReactLike]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SplineReactLike);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
