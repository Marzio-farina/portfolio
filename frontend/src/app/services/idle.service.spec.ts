import { TestBed } from '@angular/core/testing';
import { IdleService } from './idle.service';

describe('IdleService', () => {
  let service: IdleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IdleService);
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });
});

