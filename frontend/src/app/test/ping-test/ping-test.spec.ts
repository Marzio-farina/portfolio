import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PingTest } from './ping-test';

describe('PingTest', () => {
  let component: PingTest;
  let fixture: ComponentFixture<PingTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PingTest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PingTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
