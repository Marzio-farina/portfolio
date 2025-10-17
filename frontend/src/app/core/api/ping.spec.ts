import { TestBed } from '@angular/core/testing';

import { Ping } from './ping';

describe('Ping', () => {
  let service: Ping;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Ping);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
