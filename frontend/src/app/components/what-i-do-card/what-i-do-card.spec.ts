import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatIDoCard } from './what-i-do-card';

describe('WhatIDoCard', () => {
  let component: WhatIDoCard;
  let fixture: ComponentFixture<WhatIDoCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatIDoCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhatIDoCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
