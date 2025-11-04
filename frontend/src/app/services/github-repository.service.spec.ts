import { TestBed } from '@angular/core/testing';
import { GitHubRepositoryService } from './github-repository.service';
import { TEST_HTTP_PROVIDERS } from '../../testing/test-utils';

describe('GitHubRepositoryService', () => {
  let service: GitHubRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: TEST_HTTP_PROVIDERS
    });
    service = TestBed.inject(GitHubRepositoryService);
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });
});

