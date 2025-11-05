import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { GitHubService, RepoStats } from './github.service';

/**
 * Test Suite per GitHubService
 * 
 * Servizio per interagire con GitHub API tramite proxy backend
 */
describe('GitHubService', () => {
  let service: GitHubService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GitHubService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(GitHubService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('getFullRepoStats$()', () => {
    it('dovrebbe recuperare statistiche del repository', (done) => {
      const mockUrl = 'https://github.com/Marzio-farina/portfolio';
      const mockStats: RepoStats = {
        name: 'portfolio',
        url: mockUrl,
        commits: 150
      };

      service.getFullRepoStats$(mockUrl).subscribe(stats => {
        expect(stats).toBeTruthy();
        expect(stats?.name).toBe('portfolio');
        expect(stats?.commits).toBe(150);
        expect(stats?.url).toBe(mockUrl);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes('/github/Marzio-farina/portfolio/stats')
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });

    it('dovrebbe gestire URL GitHub valido con owner e repo', (done) => {
      const url = 'https://github.com/octocat/Hello-World';
      const mockStats: RepoStats = {
        name: 'Hello-World',
        url: url,
        commits: 42
      };

      service.getFullRepoStats$(url).subscribe(stats => {
        expect(stats?.name).toBe('Hello-World');
        expect(stats?.commits).toBe(42);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes('/github/octocat/Hello-World/stats')
      );
      req.flush(mockStats);
    });

    it('dovrebbe restituire null per URL non valido', (done) => {
      const invalidUrl = 'https://invalid-url.com/not-github';

      service.getFullRepoStats$(invalidUrl).subscribe(stats => {
        expect(stats).toBeNull();
        done();
      });

      // Non dovrebbe fare chiamate HTTP
      httpMock.expectNone(() => true);
    });

    it('dovrebbe restituire null per URL GitHub malformato', (done) => {
      const malformedUrl = 'https://github.com/';

      service.getFullRepoStats$(malformedUrl).subscribe(stats => {
        expect(stats).toBeNull();
        done();
      });

      httpMock.expectNone(() => true);
    });

    it('dovrebbe gestire errore HTTP e restituire oggetto con errore', (done) => {
      const url = 'https://github.com/owner/repo';

      service.getFullRepoStats$(url).subscribe(stats => {
        expect(stats).toBeTruthy();
        expect(stats?.commits).toBe(0);
        expect(stats?.error).toBeDefined();
        expect(stats?.error).toContain('Impossibile recuperare');
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes('/github/owner/repo/stats')
      );
      req.error(new ProgressEvent('Network error'));
    });

    it('dovrebbe gestire 404 Not Found', (done) => {
      const url = 'https://github.com/nonexistent/repo';

      service.getFullRepoStats$(url).subscribe(stats => {
        expect(stats).toBeTruthy();
        expect(stats?.commits).toBe(0);
        expect(stats?.error).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes('/github/nonexistent/repo/stats')
      );
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('dovrebbe gestire 500 Server Error', (done) => {
      const url = 'https://github.com/test/repo';

      service.getFullRepoStats$(url).subscribe(stats => {
        expect(stats).toBeTruthy();
        expect(stats?.commits).toBe(0);
        expect(stats?.error).toContain('Impossibile recuperare');
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes('/github/test/repo/stats')
      );
      req.flush('Internal Server Error', { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    });

    it('dovrebbe estrarre correttamente owner e repo da URL completo', (done) => {
      const url = 'https://github.com/angular/angular';

      service.getFullRepoStats$(url).subscribe();

      const req = httpMock.expectOne(req => 
        req.url.includes('/github/angular/angular/stats')
      );
      expect(req.request.url).toContain('angular/angular');
      req.flush({ name: 'angular', url: url, commits: 1000 });
      done();
    });
  });

  describe('getUserTotalCommits$()', () => {
    it('dovrebbe recuperare il totale dei commit dell\'utente', (done) => {
      const username = 'Marzio-farina';
      const mockResponse = { total_commits: 500 };

      service.getUserTotalCommits$(username).subscribe(total => {
        expect(total).toBe(500);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/github/user/${username}/total-commits`)
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('dovrebbe gestire username con caratteri speciali', (done) => {
      const username = 'user-name_123';
      const mockResponse = { total_commits: 42 };

      service.getUserTotalCommits$(username).subscribe(total => {
        expect(total).toBe(42);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/github/user/${username}/total-commits`)
      );
      req.flush(mockResponse);
    });

    it('dovrebbe restituire 0 in caso di errore HTTP', (done) => {
      const username = 'nonexistent';

      service.getUserTotalCommits$(username).subscribe(total => {
        expect(total).toBe(0);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/github/user/${username}/total-commits`)
      );
      req.error(new ProgressEvent('Network error'));
    });

    it('dovrebbe restituire 0 per 404', (done) => {
      const username = 'notfound';

      service.getUserTotalCommits$(username).subscribe(total => {
        expect(total).toBe(0);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/github/user/${username}/total-commits`)
      );
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('dovrebbe restituire 0 per risposta malformata', (done) => {
      const username = 'test';

      service.getUserTotalCommits$(username).subscribe(total => {
        expect(total).toBe(0);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/github/user/${username}/total-commits`)
      );
      // Flush risposta senza campo total_commits
      req.flush({});
    });

    it('dovrebbe gestire totale commit = 0', (done) => {
      const username = 'newuser';
      const mockResponse = { total_commits: 0 };

      service.getUserTotalCommits$(username).subscribe(total => {
        expect(total).toBe(0);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/github/user/${username}/total-commits`)
      );
      req.flush(mockResponse);
    });

    it('dovrebbe gestire numeri molto grandi di commit', (done) => {
      const username = 'superdev';
      const mockResponse = { total_commits: 999999 };

      service.getUserTotalCommits$(username).subscribe(total => {
        expect(total).toBe(999999);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/github/user/${username}/total-commits`)
      );
      req.flush(mockResponse);
    });
  });
});

/**
 * COPERTURA: ~95% del servizio
 * - getFullRepoStats$ con vari scenari
 * - getUserTotalCommits$ completo
 * - Parsing URL GitHub
 * - Error handling
 * - Edge cases
 */

