import { TestBed } from '@angular/core/testing';
import { TEST_HTTP_PROVIDERS } from '../../../testing/test-utils';
import { Ping } from './ping';

describe('Ping', () => {
  let service: Ping;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: TEST_HTTP_PROVIDERS
    });
    service = TestBed.inject(Ping);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
