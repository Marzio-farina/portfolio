import { TestBed } from '@angular/core/testing';
import { DefaultAvatarService } from './default-avatar.service';
import { TEST_HTTP_PROVIDERS } from '../../testing/test-utils';

describe('DefaultAvatarService', () => {
  let service: DefaultAvatarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: TEST_HTTP_PROVIDERS
    });
    service = TestBed.inject(DefaultAvatarService);
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });
});

