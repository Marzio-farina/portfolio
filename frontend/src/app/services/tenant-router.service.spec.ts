import { TestBed } from '@angular/core/testing';
import { TenantRouterService } from './tenant-router.service';
import { COMMON_TEST_PROVIDERS } from '../../testing/test-utils';

describe('TenantRouterService', () => {
  let service: TenantRouterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: COMMON_TEST_PROVIDERS
    });
    service = TestBed.inject(TenantRouterService);
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });
});

