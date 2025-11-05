import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProjectService } from './project.service';

/**
 * Test Suite per ProjectService
 * 
 * Servizio per gestire tutte le operazioni CRUD sui progetti
 */
describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;
  
  const API_BASE = 'http://localhost:8000'; // No /api prefix

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verifica che non ci siano richieste HTTP pendenti
    httpMock.verify();
  });

  // ========================================
  // TEST 1: Creazione del servizio
  // ========================================
  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // TEST 2: list$ - Lista paginata
  // ========================================
  describe('list$()', () => {
    it('dovrebbe recuperare una lista paginata di progetti', (done) => {
      const mockResponse = {
        data: [
          { id: 1, title: 'Project 1', description: 'Desc 1' },
          { id: 2, title: 'Project 2', description: 'Desc 2' }
        ],
        meta: {
          current_page: 1,
          per_page: 12,
          total: 2,
          last_page: 1
        }
      };

      service.list$(1, 12).subscribe(result => {
        expect(result.data.length).toBe(2);
        expect(result.meta?.current_page).toBe(1);
        expect(result.meta?.total).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects') && req.method === 'GET');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('per_page')).toBe('12');
      
      req.flush(mockResponse);
    });

    it('dovrebbe inviare userId se fornito', (done) => {
      service.list$(1, 12, 5).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/projects') && req.params.get('user_id') === '5');
      expect(req.request.method).toBe('GET');
      
      req.flush({ data: [], meta: { current_page: 1, per_page: 12, total: 0, last_page: 1 } });
    });
  });

  // ========================================
  // TEST 3: listAll$ - Tutti i progetti
  // ========================================
  describe('listAll$()', () => {
    it('dovrebbe recuperare tutti i progetti', (done) => {
      const mockProjects = [
        { id: 1, title: 'Project 1', description: 'Desc 1' },
        { id: 2, title: 'Project 2', description: 'Desc 2' },
        { id: 3, title: 'Project 3', description: 'Desc 3' }
      ];

      service.listAll$(1000).subscribe(projects => {
        expect(projects.length).toBe(3);
        expect(projects[0].id).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects') && req.params.get('per_page') === '1000');
      expect(req.request.method).toBe('GET');
      
      req.flush({ data: mockProjects });
    });
  });

  // ========================================
  // TEST 4: create$ - Crea progetto
  // ========================================
  describe('create$()', () => {
    it('dovrebbe creare un nuovo progetto', (done) => {
      const formData = new FormData();
      formData.append('title', 'Nuovo Progetto');
      formData.append('description', 'Descrizione test');

      const mockResponse = { id: 10, title: 'Nuovo Progetto', description: 'Descrizione test' };

      service.create$(formData).subscribe(project => {
        expect(project.id).toBe(10);
        expect(project.title).toBe('Nuovo Progetto');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects') && req.method === 'POST');
      expect(req.request.body instanceof FormData).toBe(true);
      
      req.flush(mockResponse);
    });
  });

  // ========================================
  // TEST 5: updateWithFiles$ - Aggiorna progetto
  // ========================================
  describe('updateWithFiles$()', () => {
    it('dovrebbe aggiornare un progetto esistente', (done) => {
      const formData = new FormData();
      formData.append('title', 'Progetto Modificato');

      const mockProjectDto = {
        id: 5,
        title: 'Progetto Modificato',
        description: 'Updated',
        poster: null,
        video: null,
        category: { id: 1, name: 'Web' },
        technologies: [{ id: 1, name: 'Angular', description: null }],
        layout_config: null
      };

      const mockResponse = {
        ok: true,
        data: mockProjectDto
      };

      service.updateWithFiles$(5, formData).subscribe(project => {
        expect(project.id).toBe(5);
        expect(project.title).toBe('Progetto Modificato');
        expect(project.description).toBe('Updated');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/5') && req.method === 'POST');
      expect(req.request.body instanceof FormData).toBe(true);
      
      req.flush(mockResponse);
    });

    it('dovrebbe aggiornare con FormData completo', (done) => {
      const formData = new FormData();
      formData.append('title', 'Updated Title');
      formData.append('description', 'New description');
      formData.append('category_id', '2');
      
      const mockProjectDto = {
        id: 10,
        title: 'Updated Title',
        description: 'New description',
        poster: 'new-poster.jpg',
        video: null,
        category: { id: 2, name: 'Mobile' },
        technologies: [],
        layout_config: null
      };

      service.updateWithFiles$(10, formData).subscribe(project => {
        expect(project.title).toBe('Updated Title');
        expect(project.category).toBe('Mobile');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/10'));
      req.flush({ ok: true, data: mockProjectDto });
    });

    it('dovrebbe gestire errore 422 durante update', (done) => {
      const formData = new FormData();
      
      service.updateWithFiles$(5, formData).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/5'));
      req.flush({ errors: { title: ['Required'] } }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  // ========================================
  // TEST 6: delete$ - Soft delete
  // ========================================
  describe('delete$()', () => {
    it('dovrebbe eliminare un progetto (soft delete)', (done) => {
      service.delete$(3).subscribe(() => {
        expect(true).toBe(true); // void ritorna
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/3') && req.method === 'DELETE');
      
      req.flush({});
    });
  });

  // ========================================
  // TEST 7: restore$ - Restore soft delete
  // ========================================
  describe('restore$()', () => {
    it('dovrebbe ripristinare un progetto soft-deleted', (done) => {
      const mockProjectDto = {
        id: 7,
        title: 'Restored Project',
        description: 'This was deleted',
        poster: null,
        video: null,
        category: { id: 1, name: 'Web' },
        technologies: [],
        layout_config: null,
        deleted_at: null
      };

      const mockResponse = {
        ok: true,
        data: mockProjectDto
      };

      service.restore$(7).subscribe(project => {
        expect(project.id).toBe(7);
        expect(project.title).toBe('Restored Project');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/7/restore') && req.method === 'PATCH');
      
      req.flush(mockResponse);
    });

    it('dovrebbe gestire errore 404 per progetto non trovato', (done) => {
      service.restore$(999).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/999/restore'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('dovrebbe gestire errore per progetto già attivo', (done) => {
      service.restore$(5).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/5/restore'));
      req.flush({ message: 'Project is not deleted' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  // ========================================
  // TEST 8: getCategories$ - Lista categorie
  // ========================================
  describe('getCategories$()', () => {
    it('dovrebbe recuperare tutte le categorie', (done) => {
      const mockCategories = [
        { id: 1, title: 'Web', description: 'Web apps' },
        { id: 2, title: 'Mobile', description: 'Mobile apps' }
      ];

      service.getCategories$().subscribe(categories => {
        expect(categories.length).toBe(2);
        expect(categories[0].title).toBe('Web');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/categories') && req.method === 'GET');
      
      req.flush(mockCategories);
    });

    it('dovrebbe filtrare per userId se fornito', (done) => {
      const mockCategories = [
        { id: 1, title: 'Cat1', description: 'Test' }
      ];

      service.getCategories$(42).subscribe(categories => {
        expect(categories).toBeDefined();
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/categories') && req.params.get('user_id') === '42');
      expect(req.request.method).toBe('GET');
      
      req.flush(mockCategories);
    });
  });

  // ========================================
  // TEST 9: createCategory - Crea categoria
  // ========================================
  describe('createCategory()', () => {
    it('dovrebbe creare una nuova categoria', (done) => {
      service.createCategory('Gaming', 'Gaming projects').subscribe(result => {
        expect(result).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/categories') && req.method === 'POST');
      expect(req.request.body.title).toBe('Gaming');
      expect(req.request.body.description).toBe('Gaming projects');
      
      req.flush({ id: 5, title: 'Gaming' });
    });
  });

  // ========================================
  // TEST 10: deleteCategory - Elimina categoria
  // ========================================
  describe('deleteCategory()', () => {
    it('dovrebbe eliminare una categoria per titolo', (done) => {
      service.deleteCategory('Mobile').subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/categories') && req.url.includes('Mobile') && req.method === 'DELETE');
      
      req.flush({});
    });
  });

  // ========================================
  // TEST 11: Gestione Errori HTTP
  // ========================================
  describe('Error Handling', () => {
    it('dovrebbe gestire errori 500', (done) => {
      service.listAll$().subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('dovrebbe gestire errori 404', (done) => {
      service.restore$(999).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/999/restore'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('dovrebbe gestire network error', (done) => {
      service.create$(new FormData()).subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      req.error(new ProgressEvent('Network error'));
    });

    it('dovrebbe gestire errore 422 (validation)', (done) => {
      service.createCategory('').subscribe({
        next: () => fail('dovrebbe fallire'),
        error: (error) => {
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/categories'));
      req.flush({ message: 'Validation failed' }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  // ========================================
  // TEST 12: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire lista vuota', (done) => {
      service.listAll$().subscribe(projects => {
        expect(projects).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      req.flush({ data: [] });
    });

    it('dovrebbe gestire categoria senza description', (done) => {
      service.createCategory('NoDesc').subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/categories'));
      expect(req.request.body.title).toBe('NoDesc');
      expect(req.request.body.description).toBeUndefined();
      req.flush({ id: 1, title: 'NoDesc' });
    });

    it('dovrebbe gestire pagination edge (last page)', (done) => {
      service.list$(10, 12).subscribe(result => {
        expect(result.meta?.current_page).toBe(10);
        expect(result.meta?.last_page).toBe(10);
        done();
      });

      const req = httpMock.expectOne(req => req.params.get('page') === '10');
      req.flush({ 
        data: [], 
        meta: { current_page: 10, per_page: 12, total: 120, last_page: 10 }
      });
    });
  });

  // ========================================
  // TEST 13: Concurrent Operations
  // ========================================
  describe('Concurrent Operations', () => {
    it('dovrebbe gestire multiple list$ calls', () => {
      service.list$(1, 12).subscribe();
      service.list$(2, 12).subscribe();
      service.list$(3, 12).subscribe();

      const reqs = httpMock.match(req => req.url.includes('/projects'));
      expect(reqs.length).toBe(3);
      
      reqs.forEach(req => req.flush({ data: [], meta: { current_page: 1, per_page: 12, total: 0, last_page: 1 } }));
    });
  });

  // ========================================
  // TEST 14: update$ - Aggiorna senza file
  // ========================================
  describe('update$()', () => {
    it('dovrebbe aggiornare progetto senza file (JSON)', (done) => {
      const updateData = {
        title: 'Updated via JSON',
        description: 'New desc',
        category_id: 2
      };

      const mockProjectDto = {
        id: 5,
        title: 'Updated via JSON',
        description: 'New desc',
        poster: 'existing-poster.jpg',
        video: null,
        category: { id: 2, name: 'Mobile' },
        technologies: [],
        layout_config: null
      };

      service.update$(5, updateData).subscribe(project => {
        expect(project.id).toBe(5);
        expect(project.title).toBe('Updated via JSON');
        expect(project.category).toBe('Mobile');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/5') && req.method === 'PUT');
      expect(req.request.body).toEqual(updateData);
      
      req.flush({ ok: true, data: mockProjectDto });
    });

    it('dovrebbe aggiornare solo technology_ids', (done) => {
      const updateData = {
        technology_ids: [1, 2, 3]
      };

      const mockProjectDto = {
        id: 8,
        title: 'Existing Project',
        description: 'Desc',
        poster: null,
        video: null,
        category: { id: 1, name: 'Web' },
        technologies: [
          { id: 1, name: 'Angular', description: null },
          { id: 2, name: 'TypeScript', description: null },
          { id: 3, name: 'RxJS', description: null }
        ],
        layout_config: null
      };

      service.update$(8, updateData).subscribe(project => {
        expect(project.technologies.length).toBe(3);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects/8'));
      req.flush({ ok: true, data: mockProjectDto });
    });
  });

  // ========================================
  // TEST 15: Cache Management
  // ========================================
  describe('Cache Management', () => {
    it('dovrebbe usare sessionStorage per cache timestamp', (done) => {
      // Se getItem ritorna null, NON chiamerà setItem (usa _t invece di _s)
      // Per testare setItem, dobbiamo simulare una sessione esistente
      const existingTimestamp = '1234567890';
      spyOn(sessionStorage, 'getItem').and.returnValue(existingTimestamp);
      spyOn(sessionStorage, 'setItem');

      service.list$(1, 12).subscribe(() => {
        // Con sessione esistente, dovrebbe chiamare setItem per mantenere il timestamp
        expect(sessionStorage.setItem).toHaveBeenCalledWith('projects_session_timestamp', existingTimestamp);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      req.flush({ data: [], meta: { current_page: 1, per_page: 12, total: 0, last_page: 1 } });
    });

    it('dovrebbe usare forceRefresh per bypassare cache', (done) => {
      service.list$(1, 12, undefined, true).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      
      // Verifica che abbia parametri per bypass cache
      expect(req.request.params.has('_nocache')).toBe(true);
      expect(req.request.params.has('_t')).toBe(true);
      expect(req.request.headers.get('Cache-Control')).toBeTruthy();
      
      req.flush({ data: [], meta: { current_page: 1, per_page: 12, total: 0, last_page: 1 } });
    });

    it('dovrebbe bypassare cache se session timestamp mancante', (done) => {
      spyOn(sessionStorage, 'getItem').and.returnValue(null);

      service.list$(1, 12).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      // Dovrebbe avere headers per bypass cache
      expect(req.request.headers.get('Cache-Control')).toBeTruthy();
      
      req.flush({ data: [], meta: { current_page: 1, per_page: 12, total: 0, last_page: 1 } });
    });

    it('dovrebbe usare session timestamp se presente', (done) => {
      const mockTimestamp = '1234567890';
      spyOn(sessionStorage, 'getItem').and.returnValue(mockTimestamp);

      service.list$(1, 12).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      
      // Verifica che abbia il parametro session timestamp
      expect(req.request.params.get('_s')).toBe(mockTimestamp);
      expect(req.request.headers.get('Cache-Control')).toBeFalsy();
      
      req.flush({ data: [], meta: { current_page: 1, per_page: 12, total: 0, last_page: 1 } });
    });
  });

  // ========================================
  // TEST 16: DTO Transformation
  // ========================================
  describe('DTO to Progetto Transformation', () => {
    it('dovrebbe convertire DTO con tutti i campi', (done) => {
      const mockDto = {
        id: 1,
        title: 'Test Project',
        description: 'Test description',
        poster: 'poster.jpg',
        video: 'video.mp4',
        category: { id: 1, name: 'Web' },
        technologies: [
          { id: 1, name: 'Angular', description: 'Framework' },
          { id: 2, name: 'TypeScript', description: null }
        ],
        layout_config: '{"layout":"grid"}'
      };

      service.listAll$(10).subscribe(projects => {
        const project = projects[0];
        expect(project.id).toBe(1);
        expect(project.title).toBe('Test Project');
        expect(project.category).toBe('Web');
        expect(project.technologies.length).toBe(2);
        expect(project.technologiesString).toBe('Angular, TypeScript');
        expect(project.layout_config).toBe('{"layout":"grid"}');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      req.flush({ data: [mockDto] });
    });

    it('dovrebbe gestire DTO con campi null', (done) => {
      const mockDto = {
        id: 2,
        title: 'Minimal Project',
        description: null,
        poster: null,
        video: null,
        category: null,
        technologies: [],
        layout_config: null
      };

      service.listAll$(10).subscribe(projects => {
        const project = projects[0];
        expect(project.description).toBe('');
        expect(project.poster).toBe('');
        expect(project.category).toBe('Senza categoria');
        expect(project.technologies.length).toBe(0);
        expect(project.technologiesString).toBe('');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      req.flush({ data: [mockDto] });
    });

    it('dovrebbe gestire category con title invece di name', (done) => {
      const mockDto = {
        id: 3,
        title: 'Project',
        description: '',
        poster: null,
        video: null,
        category: { id: 5, title: 'Gaming' }, // title invece di name
        technologies: [],
        layout_config: null
      };

      service.listAll$(10).subscribe(projects => {
        expect(projects[0].category).toBe('Gaming');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      req.flush({ data: [mockDto] });
    });

    it('dovrebbe filtrare tecnologie senza titolo', (done) => {
      const mockDto = {
        id: 4,
        title: 'Project',
        description: '',
        poster: null,
        video: null,
        category: null,
        technologies: [
          { id: 1, name: 'Valid Tech', description: null },
          { id: 2, name: null, description: null }, // Dovrebbe essere filtrata
          { id: 3, title: 'Valid Tech 2', description: null }
        ],
        layout_config: null
      };

      service.listAll$(10).subscribe(projects => {
        // Dovrebbe avere solo 2 tecnologie valide
        expect(projects[0].technologies.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/projects'));
      req.flush({ data: [mockDto] });
    });
  });
});

/**
 * COPERTURA TEST PROJECT SERVICE
 * ===============================
 * 
 * ✅ Creazione servizio
 * ✅ list$ - Lista paginata con/senza userId
 * ✅ listAll$ - Tutti i progetti
 * ✅ create$ - Creazione progetto
 * ✅ update$ - Aggiornamento senza file (JSON/PUT)
 * ✅ updateWithFiles$ - Aggiornamento con FormData (POST)
 * ✅ updateWithFiles$ - Errori 422
 * ✅ delete$ - Soft delete
 * ✅ restore$ - Ripristino soft delete
 * ✅ restore$ - Errori (404, 400 progetto già attivo)
 * ✅ getCategories$ - Lista categorie con/senza userId
 * ✅ createCategory - Creazione categoria
 * ✅ deleteCategory - Eliminazione categoria
 * ✅ Error handling (500, 404, 422, network)
 * ✅ Concurrent operations (multiple list$ calls)
 * ✅ Cache management (sessionStorage, forceRefresh, timestamps)
 * ✅ DTO Transformation (tutti i campi, campi null)
 * ✅ DTO Transformation (category title vs name)
 * ✅ DTO Transformation (filtraggio tecnologie invalide)
 * ✅ Edge cases (pagination, empty lists, no description)
 * 
 * COVERAGE STIMATA: ~92% del servizio
 * 
 * AGGIUNTO NELLA SESSIONE:
 * =======================
 * - Test updateWithFiles$ abilitati e migliorati (3 test)
 * - Test restore$ abilitati e migliorati (3 test)
 * - Test update$ method (2 test)
 * - Test cache management (4 test)
 * - Test DTO transformation (4 test)
 * - Test concurrent operations (1 test)
 * 
 * TOTALE: +17 nuovi test aggiunti
 */

