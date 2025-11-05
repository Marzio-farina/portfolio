import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { GitHubRepositoryService, GitHubRepositoryDto, GitHubRepositoryResponse } from './github-repository.service';
import { TEST_HTTP_PROVIDERS } from '../../testing/test-utils';

/**
 * Test Suite Completa per GitHubRepositoryService
 * 
 * Servizio per gestire multiple repository GitHub per utente
 */
describe('GitHubRepositoryService', () => {
  let service: GitHubRepositoryService;
  let httpMock: HttpTestingController;

  const mockRepo1: GitHubRepositoryResponse = {
    id: 1,
    owner: 'Marzio-farina',
    repo: 'portfolio',
    url: 'https://github.com/Marzio-farina/portfolio',
    order: 0
  };

  const mockRepo2: GitHubRepositoryResponse = {
    id: 2,
    owner: 'user123',
    repo: 'awesome-project',
    url: 'https://github.com/user123/awesome-project',
    order: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: TEST_HTTP_PROVIDERS
    });
    service = TestBed.inject(GitHubRepositoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // TEST: getAll$()
  // ========================================
  describe('getAll$()', () => {
    it('dovrebbe recuperare tutte le repository', (done) => {
      const mockRepos = [mockRepo1, mockRepo2];

      service.getAll$().subscribe(repos => {
        expect(repos.length).toBe(2);
        expect(repos[0].owner).toBe('Marzio-farina');
        expect(repos[1].owner).toBe('user123');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      expect(req.request.method).toBe('GET');
      req.flush(mockRepos);
    });

    it('dovrebbe gestire lista vuota', (done) => {
      service.getAll$().subscribe(repos => {
        expect(repos).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush([]);
    });

    it('dovrebbe preservare ordine dal server', (done) => {
      const orderedRepos = [
        { ...mockRepo2, order: 0 },
        { ...mockRepo1, order: 1 }
      ];

      service.getAll$().subscribe(repos => {
        expect(repos[0].id).toBe(2);
        expect(repos[1].id).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush(orderedRepos);
    });

    it('dovrebbe gestire molte repository', (done) => {
      const manyRepos = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        owner: `user${i}`,
        repo: `repo${i}`,
        url: `https://github.com/user${i}/repo${i}`,
        order: i
      }));

      service.getAll$().subscribe(repos => {
        expect(repos.length).toBe(20);
        expect(repos[0].owner).toBe('user0');
        expect(repos[19].owner).toBe('user19');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush(manyRepos);
    });

    it('dovrebbe gestire 404 error', (done) => {
      service.getAll$().subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('dovrebbe gestire 500 error', (done) => {
      service.getAll$().subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // ========================================
  // TEST: create$()
  // ========================================
  describe('create$()', () => {
    it('dovrebbe creare una nuova repository', (done) => {
      const newRepo: GitHubRepositoryDto = {
        owner: 'testuser',
        repo: 'new-repo',
        url: 'https://github.com/testuser/new-repo'
      };

      service.create$(newRepo).subscribe(repo => {
        expect(repo.id).toBeDefined();
        expect(repo.owner).toBe('testuser');
        expect(repo.repo).toBe('new-repo');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newRepo);
      req.flush({ ...newRepo, id: 3, order: 2 });
    });

    it('dovrebbe inviare dati corretti nel body', (done) => {
      const newRepo: GitHubRepositoryDto = {
        owner: 'owner123',
        repo: 'repo-name',
        url: 'https://github.com/owner123/repo-name'
      };

      service.create$(newRepo).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      expect(req.request.body.owner).toBe('owner123');
      expect(req.request.body.repo).toBe('repo-name');
      expect(req.request.body.url).toContain('github.com');
      req.flush({ ...newRepo, id: 4, order: 3 });
    });

    it('dovrebbe gestire owner con caratteri speciali', (done) => {
      const newRepo: GitHubRepositoryDto = {
        owner: 'user-name_123',
        repo: 'my-repo',
        url: 'https://github.com/user-name_123/my-repo'
      };

      service.create$(newRepo).subscribe(repo => {
        expect(repo.owner).toBe('user-name_123');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush({ ...newRepo, id: 5, order: 4 });
    });

    it('dovrebbe gestire repo name con trattini', (done) => {
      const newRepo: GitHubRepositoryDto = {
        owner: 'user',
        repo: 'my-awesome-repo-2024',
        url: 'https://github.com/user/my-awesome-repo-2024'
      };

      service.create$(newRepo).subscribe(repo => {
        expect(repo.repo).toBe('my-awesome-repo-2024');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush({ ...newRepo, id: 6, order: 5 });
    });

    it('dovrebbe gestire URL completi GitHub', (done) => {
      const newRepo: GitHubRepositoryDto = {
        owner: 'user',
        repo: 'repo',
        url: 'https://github.com/user/repo.git'
      };

      service.create$(newRepo).subscribe(repo => {
        expect(repo.url).toContain('.git');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush({ ...newRepo, id: 7, order: 6 });
    });

    it('dovrebbe gestire 400 bad request', (done) => {
      const invalidRepo: GitHubRepositoryDto = {
        owner: '',
        repo: '',
        url: ''
      };

      service.create$(invalidRepo).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('dovrebbe gestire 409 conflict (già esistente)', (done) => {
      const existingRepo: GitHubRepositoryDto = {
        owner: 'user',
        repo: 'existing-repo',
        url: 'https://github.com/user/existing-repo'
      };

      service.create$(existingRepo).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(409);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });
  });

  // ========================================
  // TEST: delete$()
  // ========================================
  describe('delete$()', () => {
    it('dovrebbe eliminare una repository', (done) => {
      service.delete$(1).subscribe(response => {
        expect(response.message).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/1'));
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Repository deleted successfully' });
    });

    it('dovrebbe includere ID corretto nell\'URL', (done) => {
      service.delete$(42).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/42'));
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Deleted' });
    });

    it('dovrebbe gestire id = 0', (done) => {
      service.delete$(0).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/0'));
      req.flush({ message: 'Deleted' });
    });

    it('dovrebbe gestire id molto grande', (done) => {
      service.delete$(999999).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/999999'));
      req.flush({ message: 'Deleted' });
    });

    it('dovrebbe gestire 404 not found', (done) => {
      service.delete$(123).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/123'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('dovrebbe gestire 403 forbidden', (done) => {
      service.delete$(5).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/5'));
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('dovrebbe gestire network error', (done) => {
      service.delete$(10).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/10'));
      req.error(new ProgressEvent('Network error'));
    });
  });

  // ========================================
  // TEST: updateOrder$()
  // ========================================
  describe('updateOrder$()', () => {
    it('dovrebbe aggiornare ordine repository', (done) => {
      const order = [
        { id: 1, order: 1 },
        { id: 2, order: 0 }
      ];

      service.updateOrder$(order).subscribe(response => {
        expect(response.message).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ order });
      req.flush({ message: 'Order updated successfully' });
    });

    it('dovrebbe inviare array di ordini nel body', (done) => {
      const order = [
        { id: 3, order: 2 },
        { id: 1, order: 0 },
        { id: 2, order: 1 }
      ];

      service.updateOrder$(order).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      expect(req.request.body.order).toEqual(order);
      expect(req.request.body.order.length).toBe(3);
      req.flush({ message: 'Updated' });
    });

    it('dovrebbe gestire ordine vuoto', (done) => {
      service.updateOrder$([]).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      expect(req.request.body.order).toEqual([]);
      req.flush({ message: 'No changes' });
    });

    it('dovrebbe gestire molti items', (done) => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        order: 49 - i // Ordine invertito
      }));

      service.updateOrder$(manyItems).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      expect(req.request.body.order.length).toBe(50);
      req.flush({ message: 'Updated' });
    });

    it('dovrebbe gestire 400 bad request', (done) => {
      const invalidOrder = [{ id: 1, order: -1 }];

      service.updateOrder$(invalidOrder).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('dovrebbe gestire 404 not found', (done) => {
      const nonExistentOrder = [{ id: 99999, order: 0 }];

      service.updateOrder$(nonExistentOrder).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire repository con nome molto lungo', (done) => {
      const longName = 'a'.repeat(100);
      const repo: GitHubRepositoryDto = {
        owner: 'user',
        repo: longName,
        url: `https://github.com/user/${longName}`
      };

      service.create$(repo).subscribe(result => {
        expect(result.repo.length).toBe(100);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush({ ...repo, id: 100, order: 99 });
    });

    it('dovrebbe gestire owner con numeri', (done) => {
      const repo: GitHubRepositoryDto = {
        owner: 'user123456',
        repo: 'repo',
        url: 'https://github.com/user123456/repo'
      };

      service.create$(repo).subscribe(result => {
        expect(result.owner).toBe('user123456');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush({ ...repo, id: 101, order: 100 });
    });

    it('dovrebbe gestire URL con query parameters', (done) => {
      const repo: GitHubRepositoryDto = {
        owner: 'user',
        repo: 'repo',
        url: 'https://github.com/user/repo?tab=readme'
      };

      service.create$(repo).subscribe(result => {
        expect(result.url).toContain('?tab=readme');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush({ ...repo, id: 102, order: 101 });
    });

    it('dovrebbe gestire ordine con numeri negativi', (done) => {
      const order = [
        { id: 1, order: -1 },
        { id: 2, order: -2 }
      ];

      service.updateOrder$(order).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      req.flush({ message: 'Updated' });
    });

    it('dovrebbe gestire ordine con gaps', (done) => {
      const order = [
        { id: 1, order: 0 },
        { id: 2, order: 10 },
        { id: 3, order: 20 }
      ];

      service.updateOrder$(order).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      req.flush({ message: 'Updated' });
    });
  });

  // ========================================
  // TEST: Performance
  // ========================================
  describe('Performance', () => {
    it('dovrebbe processare 100 repository velocemente', (done) => {
      const manyRepos = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        owner: `owner${i}`,
        repo: `repo${i}`,
        url: `https://github.com/owner${i}/repo${i}`,
        order: i
      }));

      const start = performance.now();

      service.getAll$().subscribe(repos => {
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(200);
        expect(repos.length).toBe(100);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req.flush(manyRepos);
    });

    it('updateOrder con 100 items dovrebbe essere veloce', (done) => {
      const manyOrders = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        order: i
      }));

      const start = performance.now();

      service.updateOrder$(manyOrders).subscribe(() => {
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
      req.flush({ message: 'Updated' });
    });
  });

  // ========================================
  // TEST: Service Singleton
  // ========================================
  describe('Service Singleton', () => {
    it('dovrebbe essere singleton', () => {
      const service1 = TestBed.inject(GitHubRepositoryService);
      const service2 = TestBed.inject(GitHubRepositoryService);
      
      expect(service1).toBe(service2);
    });
  });

  // ========================================
  // TEST: Real World Workflows
  // ========================================
  describe('Real World Workflows', () => {
    it('dovrebbe gestire workflow: create → getAll → delete', (done) => {
      const newRepo: GitHubRepositoryDto = {
        owner: 'user',
        repo: 'new-repo',
        url: 'https://github.com/user/new-repo'
      };

      // 1. Create
      service.create$(newRepo).subscribe(created => {
        expect(created.id).toBe(10);

        // 2. GetAll (include nuovo repo)
        service.getAll$().subscribe(repos => {
          expect(repos.some(r => r.id === 10)).toBe(true);

          // 3. Delete
          service.delete$(10).subscribe(response => {
            expect(response.message).toBeDefined();
            done();
          });

          const reqDelete = httpMock.expectOne(req => req.url.includes('/github-repositories/10'));
          reqDelete.flush({ message: 'Deleted' });
        });

        const reqGetAll = httpMock.expectOne(req => req.url.includes('/github-repositories'));
        reqGetAll.flush([mockRepo1, { ...newRepo, id: 10, order: 2 }]);
      });

      const reqCreate = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      reqCreate.flush({ ...newRepo, id: 10, order: 2 });
    });

    it('dovrebbe gestire workflow: create multiple → reorder', (done) => {
      // Create 3 repos
      const repos: GitHubRepositoryDto[] = [
        { owner: 'user1', repo: 'repo1', url: 'https://github.com/user1/repo1' },
        { owner: 'user2', repo: 'repo2', url: 'https://github.com/user2/repo2' },
        { owner: 'user3', repo: 'repo3', url: 'https://github.com/user3/repo3' }
      ];

      let createdIds: number[] = [];

      // Create repos sequentially
      service.create$(repos[0]).subscribe(r1 => {
        createdIds.push(r1.id);
        
        service.create$(repos[1]).subscribe(r2 => {
          createdIds.push(r2.id);
          
          service.create$(repos[2]).subscribe(r3 => {
            createdIds.push(r3.id);

            // Now reorder them
            const newOrder = [
              { id: createdIds[2], order: 0 },
              { id: createdIds[0], order: 1 },
              { id: createdIds[1], order: 2 }
            ];

            service.updateOrder$(newOrder).subscribe(response => {
              expect(response.message).toBeDefined();
              done();
            });

            const reqOrder = httpMock.expectOne(req => req.url.includes('/github-repositories/reorder'));
            reqOrder.flush({ message: 'Updated' });
          });

          const req3 = httpMock.expectOne(req => req.url.includes('/github-repositories'));
          req3.flush({ ...repos[2], id: 3, order: 2 });
        });

        const req2 = httpMock.expectOne(req => req.url.includes('/github-repositories'));
        req2.flush({ ...repos[1], id: 2, order: 1 });
      });

      const req1 = httpMock.expectOne(req => req.url.includes('/github-repositories'));
      req1.flush({ ...repos[0], id: 1, order: 0 });
    });
  });
});

/**
 * COPERTURA TEST GITHUB REPOSITORY SERVICE
 * =========================================
 * 
 * ✅ Creazione servizio
 * ✅ getAll$() - base, vuoto, ordine, molte, errori 404/500 (6 test)
 * ✅ create$() - base, body check, caratteri speciali, URL, errori 400/409 (7 test)
 * ✅ delete$() - base, ID check, id=0/grande, errori 404/403/network (7 test)
 * ✅ updateOrder$() - base, body check, vuoto, molti, errori 400/404 (6 test)
 * ✅ Edge cases (name lungo, owner numeri, URL query, ordine negativo/gaps) (5 test)
 * ✅ Performance (100 repos, 100 orders) (2 test)
 * ✅ Service singleton (1 test)
 * ✅ Real world workflows (create→getAll→delete, create multiple→reorder) (2 test)
 * 
 * COVERAGE STIMATA: ~100% del servizio
 * 
 * TOTALE: +36 nuovi test aggiunti
 * 
 * Pattern testati:
 * - CRUD completo (Create, Read, Delete)
 * - Reordering items
 * - Multiple items handling
 * - Error handling (400, 403, 404, 409, 500, network)
 * - Edge cases (long names, special chars, query params)
 * - Performance con large datasets
 * - Real-world workflows sequenziali
 */

