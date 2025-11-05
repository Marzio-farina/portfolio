import { TestBed } from '@angular/core/testing';
import { OptimisticTechnologyService, OptimisticTechnology } from './optimistic-technology.service';

/**
 * Test Suite Completa per OptimisticTechnologyService
 * 
 * Servizio critico per UI ottimistica - gestisce tecnologie temporanee
 * durante chiamate API asincrone
 */
describe('OptimisticTechnologyService', () => {
  let service: OptimisticTechnologyService;

  const mockTech1: OptimisticTechnology = {
    id: -1,
    title: 'Angular',
    description: 'Frontend Framework',
    isOptimistic: true,
    tempId: 'temp-1',
    projectId: 1
  };

  const mockTech2: OptimisticTechnology = {
    id: -2,
    title: 'Laravel',
    description: 'Backend Framework',
    isOptimistic: true,
    tempId: 'temp-2',
    projectId: 1
  };

  const mockTech3: OptimisticTechnology = {
    id: -3,
    title: 'React',
    description: null,
    isOptimistic: true,
    tempId: 'temp-3',
    projectId: 2
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OptimisticTechnologyService]
    });
    service = TestBed.inject(OptimisticTechnologyService);
  });

  // ========================================
  // TEST: Creazione
  // ========================================
  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // TEST: getTechnologiesForProject()
  // ========================================
  describe('getTechnologiesForProject()', () => {
    it('dovrebbe ritornare array vuoto per progetto senza tecnologie', () => {
      const techs = service.getTechnologiesForProject(999);
      expect(techs).toEqual([]);
    });

    it('dovrebbe ritornare tecnologie per progetto specifico', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(2);
      expect(techs[0].title).toBe('Angular');
      expect(techs[1].title).toBe('Laravel');
    });

    it('non dovrebbe ritornare tecnologie di altri progetti', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(2, mockTech3);

      const techs1 = service.getTechnologiesForProject(1);
      const techs2 = service.getTechnologiesForProject(2);

      expect(techs1.length).toBe(1);
      expect(techs1[0].title).toBe('Angular');
      expect(techs2.length).toBe(1);
      expect(techs2[0].title).toBe('React');
    });

    it('dovrebbe funzionare per projectId = 0', () => {
      const tech0 = { ...mockTech1, projectId: 0, tempId: 'temp-0' };
      service.addOptimisticTechnology(0, tech0);

      const techs = service.getTechnologiesForProject(0);
      expect(techs.length).toBe(1);
    });
  });

  // ========================================
  // TEST: addOptimisticTechnology()
  // ========================================
  describe('addOptimisticTechnology()', () => {
    it('dovrebbe aggiungere tecnologia ottimistica', () => {
      service.addOptimisticTechnology(1, mockTech1);

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(1);
      expect(techs[0]).toEqual(mockTech1);
    });

    it('dovrebbe aggiungere multiple tecnologie', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);
      service.addOptimisticTechnology(1, { ...mockTech1, tempId: 'temp-3' });

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(3);
    });

    it('dovrebbe mantenere ordine di inserimento', () => {
      service.addOptimisticTechnology(1, mockTech1); // Angular
      service.addOptimisticTechnology(1, mockTech2); // Laravel
      
      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].title).toBe('Angular');
      expect(techs[1].title).toBe('Laravel');
    });

    it('dovrebbe gestire description null', () => {
      const techWithNullDesc = { ...mockTech1, description: null };
      service.addOptimisticTechnology(1, techWithNullDesc);

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].description).toBeNull();
    });

    it('dovrebbe gestire tempId univoci', () => {
      service.addOptimisticTechnology(1, { ...mockTech1, tempId: 'temp-a' });
      service.addOptimisticTechnology(1, { ...mockTech1, tempId: 'temp-b' });
      service.addOptimisticTechnology(1, { ...mockTech1, tempId: 'temp-c' });

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(3);
    });

    it('dovrebbe preservare tutti i campi della tecnologia', () => {
      service.addOptimisticTechnology(1, mockTech1);

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].id).toBe(-1);
      expect(techs[0].title).toBe('Angular');
      expect(techs[0].description).toBe('Frontend Framework');
      expect(techs[0].isOptimistic).toBe(true);
      expect(techs[0].tempId).toBe('temp-1');
      expect(techs[0].projectId).toBe(1);
    });
  });

  // ========================================
  // TEST: removeOptimisticTechnology()
  // ========================================
  describe('removeOptimisticTechnology()', () => {
    it('dovrebbe rimuovere tecnologia ottimistica', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.removeOptimisticTechnology(1, 'temp-1');

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(0);
    });

    it('dovrebbe rimuovere solo tecnologia specificata', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);
      
      service.removeOptimisticTechnology(1, 'temp-1');

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(1);
      expect(techs[0].title).toBe('Laravel');
    });

    it('non dovrebbe rimuovere tecnologie di altri progetti', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(2, mockTech3);
      
      service.removeOptimisticTechnology(1, 'temp-1');

      const techs1 = service.getTechnologiesForProject(1);
      const techs2 = service.getTechnologiesForProject(2);
      
      expect(techs1.length).toBe(0);
      expect(techs2.length).toBe(1);
    });

    it('non dovrebbe generare errori se tempId non esiste', () => {
      service.addOptimisticTechnology(1, mockTech1);
      
      expect(() => service.removeOptimisticTechnology(1, 'non-existent')).not.toThrow();
      
      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(1);
    });

    it('non dovrebbe generare errori se projectId non esiste', () => {
      expect(() => service.removeOptimisticTechnology(999, 'temp-1')).not.toThrow();
    });

    it('dovrebbe rimuovere in ordine corretto', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);
      service.addOptimisticTechnology(1, { ...mockTech1, tempId: 'temp-3', title: 'Vue' });

      service.removeOptimisticTechnology(1, 'temp-2'); // Remove Laravel (middle)

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(2);
      expect(techs[0].title).toBe('Angular');
      expect(techs[1].title).toBe('Vue');
    });
  });

  // ========================================
  // TEST: markAsRemoving()
  // ========================================
  describe('markAsRemoving()', () => {
    it('dovrebbe marcare tecnologia come in rimozione', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.markAsRemoving(1, 'temp-1');

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].isRemoving).toBe(true);
    });

    it('non dovrebbe marcare altre tecnologie', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);
      
      service.markAsRemoving(1, 'temp-1');

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].isRemoving).toBe(true);
      expect(techs[1].isRemoving).toBeUndefined();
    });

    it('non dovrebbe generare errori se tempId non esiste', () => {
      service.addOptimisticTechnology(1, mockTech1);
      
      expect(() => service.markAsRemoving(1, 'non-existent')).not.toThrow();
    });

    it('dovrebbe preservare altri campi', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.markAsRemoving(1, 'temp-1');

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].title).toBe('Angular');
      expect(techs[0].description).toBe('Frontend Framework');
      expect(techs[0].isOptimistic).toBe(true);
    });
  });

  // ========================================
  // TEST: isPending()
  // ========================================
  describe('isPending()', () => {
    it('dovrebbe ritornare false se tecnologia non è pending', () => {
      expect(service.isPending(1, 'Angular')).toBe(false);
    });

    it('dovrebbe ritornare true se tecnologia è pending', () => {
      service.addOptimisticTechnology(1, mockTech1);
      
      expect(service.isPending(1, 'Angular')).toBe(true);
    });

    it('dovrebbe essere case-insensitive', () => {
      service.addOptimisticTechnology(1, mockTech1); // 'Angular'
      
      expect(service.isPending(1, 'angular')).toBe(true);
      expect(service.isPending(1, 'ANGULAR')).toBe(true);
      expect(service.isPending(1, 'AnGuLaR')).toBe(true);
    });

    it('non dovrebbe confondere progetti diversi', () => {
      service.addOptimisticTechnology(1, mockTech1);
      
      expect(service.isPending(1, 'Angular')).toBe(true);
      expect(service.isPending(2, 'Angular')).toBe(false);
    });

    it('dovrebbe gestire nomi parziali', () => {
      service.addOptimisticTechnology(1, mockTech1); // 'Angular'
      
      // Match esatto
      expect(service.isPending(1, 'Angular')).toBe(true);
      // Non match parziale
      expect(service.isPending(1, 'Ang')).toBe(false);
    });

    it('dovrebbe gestire spazi', () => {
      const techWithSpace = { ...mockTech1, title: 'Angular Material' };
      service.addOptimisticTechnology(1, techWithSpace);
      
      expect(service.isPending(1, 'Angular Material')).toBe(true);
      expect(service.isPending(1, 'angular material')).toBe(true);
    });
  });

  // ========================================
  // TEST: cleanupOldTechnologies()
  // ========================================
  describe('cleanupOldTechnologies()', () => {
    it('non dovrebbe rimuovere tecnologie recenti', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.cleanupOldTechnologies();

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(1);
    });

    it('dovrebbe rimuovere tecnologie vecchie (> 5 minuti)', (done) => {
      // Mock timestamp vecchio manipolando Date.now
      const originalDateNow = Date.now;
      const oldTimestamp = originalDateNow() - (6 * 60 * 1000); // 6 minuti fa

      // Aggiungi con timestamp vecchio
      Date.now = () => oldTimestamp;
      service.addOptimisticTechnology(1, mockTech1);
      Date.now = originalDateNow; // Ripristina

      // Cleanup dovrebbe rimuoverla
      service.cleanupOldTechnologies();

      setTimeout(() => {
        const techs = service.getTechnologiesForProject(1);
        expect(techs.length).toBe(0);
        done();
      }, 10);
    });

    it('dovrebbe pulire multiple tecnologie vecchie', (done) => {
      const originalDateNow = Date.now;
      const oldTimestamp = originalDateNow() - (6 * 60 * 1000);

      Date.now = () => oldTimestamp;
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);
      Date.now = originalDateNow;

      service.cleanupOldTechnologies();

      setTimeout(() => {
        const techs = service.getTechnologiesForProject(1);
        expect(techs.length).toBe(0);
        done();
      }, 10);
    });

    it('dovrebbe mantenere tecnologie recenti e rimuovere vecchie', (done) => {
      const originalDateNow = Date.now;
      
      // Aggiungi vecchia
      const oldTimestamp = originalDateNow() - (6 * 60 * 1000);
      Date.now = () => oldTimestamp;
      service.addOptimisticTechnology(1, mockTech1);
      
      // Aggiungi recente
      Date.now = originalDateNow;
      service.addOptimisticTechnology(1, mockTech2);

      service.cleanupOldTechnologies();

      setTimeout(() => {
        const techs = service.getTechnologiesForProject(1);
        expect(techs.length).toBe(1);
        expect(techs[0].title).toBe('Laravel');
        done();
      }, 10);
    });

    it('non dovrebbe generare errori se non ci sono tecnologie', () => {
      expect(() => service.cleanupOldTechnologies()).not.toThrow();
    });
  });

  // ========================================
  // TEST: clearProjectTechnologies()
  // ========================================
  describe('clearProjectTechnologies()', () => {
    it('dovrebbe pulire tutte le tecnologie di un progetto', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);
      
      service.clearProjectTechnologies(1);

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(0);
    });

    it('non dovrebbe pulire altri progetti', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(2, mockTech3);
      
      service.clearProjectTechnologies(1);

      const techs1 = service.getTechnologiesForProject(1);
      const techs2 = service.getTechnologiesForProject(2);
      
      expect(techs1.length).toBe(0);
      expect(techs2.length).toBe(1);
    });

    it('non dovrebbe generare errori se progetto non esiste', () => {
      expect(() => service.clearProjectTechnologies(999)).not.toThrow();
    });

    it('dovrebbe funzionare multiple volte', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.clearProjectTechnologies(1);
      service.clearProjectTechnologies(1);
      service.clearProjectTechnologies(1);

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(0);
    });
  });

  // ========================================
  // TEST: Multiple Projects
  // ========================================
  describe('Multiple Projects', () => {
    it('dovrebbe gestire tecnologie per progetti diversi', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(2, mockTech3);
      service.addOptimisticTechnology(3, { ...mockTech2, projectId: 3, tempId: 'temp-4' });

      expect(service.getTechnologiesForProject(1).length).toBe(1);
      expect(service.getTechnologiesForProject(2).length).toBe(1);
      expect(service.getTechnologiesForProject(3).length).toBe(1);
    });

    it('operazioni su un progetto non dovrebbero influenzare altri', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(2, mockTech3);

      service.removeOptimisticTechnology(1, 'temp-1');

      expect(service.getTechnologiesForProject(1).length).toBe(0);
      expect(service.getTechnologiesForProject(2).length).toBe(1);
    });

    it('clearProject dovrebbe pulire solo progetto specificato', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);
      service.addOptimisticTechnology(2, mockTech3);

      service.clearProjectTechnologies(1);

      expect(service.getTechnologiesForProject(1).length).toBe(0);
      expect(service.getTechnologiesForProject(2).length).toBe(1);
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire tempId con caratteri speciali', () => {
      const tech = { ...mockTech1, tempId: 'temp-@#$%-123' };
      service.addOptimisticTechnology(1, tech);

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].tempId).toBe('temp-@#$%-123');
    });

    it('dovrebbe gestire title molto lungo', () => {
      const tech = { ...mockTech1, title: 'A'.repeat(500) };
      service.addOptimisticTechnology(1, tech);

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].title.length).toBe(500);
    });

    it('dovrebbe gestire description molto lunga', () => {
      const tech = { ...mockTech1, description: 'B'.repeat(1000) };
      service.addOptimisticTechnology(1, tech);

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].description?.length).toBe(1000);
    });

    it('dovrebbe gestire id negativi grandi', () => {
      const tech = { ...mockTech1, id: -999999 };
      service.addOptimisticTechnology(1, tech);

      const techs = service.getTechnologiesForProject(1);
      expect(techs[0].id).toBe(-999999);
    });

    it('dovrebbe gestire projectId molto grandi', () => {
      const tech = { ...mockTech1, projectId: 999999 };
      service.addOptimisticTechnology(999999, tech);

      const techs = service.getTechnologiesForProject(999999);
      expect(techs.length).toBe(1);
    });
  });

  // ========================================
  // TEST: Performance
  // ========================================
  describe('Performance', () => {
    it('dovrebbe gestire molte tecnologie per progetto', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        service.addOptimisticTechnology(1, {
          ...mockTech1,
          tempId: `temp-${i}`,
          title: `Tech ${i}`
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(100);
    });

    it('dovrebbe gestire molti progetti', () => {
      const start = performance.now();

      for (let i = 0; i < 50; i++) {
        service.addOptimisticTechnology(i, {
          ...mockTech1,
          projectId: i,
          tempId: `temp-${i}`
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);

      for (let i = 0; i < 50; i++) {
        expect(service.getTechnologiesForProject(i).length).toBe(1);
      }
    });

    it('operazioni di rimozione dovrebbero essere veloci', () => {
      // Aggiungi 50 tecnologie
      for (let i = 0; i < 50; i++) {
        service.addOptimisticTechnology(1, {
          ...mockTech1,
          tempId: `temp-${i}`
        });
      }

      const start = performance.now();
      service.removeOptimisticTechnology(1, 'temp-25');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      expect(service.getTechnologiesForProject(1).length).toBe(49);
    });
  });

  // ========================================
  // TEST: Service Persistence
  // ========================================
  describe('Service Persistence', () => {
    it('dovrebbe essere singleton', () => {
      const service1 = TestBed.inject(OptimisticTechnologyService);
      const service2 = TestBed.inject(OptimisticTechnologyService);

      expect(service1).toBe(service2);
    });

    it('stato dovrebbe persistere tra chiamate', () => {
      service.addOptimisticTechnology(1, mockTech1);

      const service2 = TestBed.inject(OptimisticTechnologyService);
      const techs = service2.getTechnologiesForProject(1);

      expect(techs.length).toBe(1);
    });
  });

  // ========================================
  // TEST: Workflow Reale
  // ========================================
  describe('Workflow Reale', () => {
    it('dovrebbe simulare aggiunta e rimozione dopo API success', () => {
      // 1. Utente aggiunge tecnologia (UI ottimistica)
      service.addOptimisticTechnology(1, mockTech1);
      expect(service.getTechnologiesForProject(1).length).toBe(1);

      // 2. API completa con successo
      service.removeOptimisticTechnology(1, 'temp-1');
      expect(service.getTechnologiesForProject(1).length).toBe(0);
    });

    it('dovrebbe simulare rimozione fallita', () => {
      // 1. Aggiungi tecnologia
      service.addOptimisticTechnology(1, mockTech1);
      
      // 2. Utente prova a rimuovere (marca come removing)
      service.markAsRemoving(1, 'temp-1');
      expect(service.getTechnologiesForProject(1)[0].isRemoving).toBe(true);

      // 3. API fallisce - non rimuovere (reset isRemoving se necessario)
      // In questo caso, l'UI dovrebbe gestire il rollback
      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(1);
    });

    it('dovrebbe prevenire duplicati con isPending', () => {
      service.addOptimisticTechnology(1, mockTech1);

      // Tentativo di aggiungere di nuovo Angular
      if (service.isPending(1, 'Angular')) {
        // Non aggiungere
      } else {
        service.addOptimisticTechnology(1, { ...mockTech1, tempId: 'temp-2' });
      }

      const techs = service.getTechnologiesForProject(1);
      expect(techs.length).toBe(1); // Solo una
    });

    it('dovrebbe gestire navigation tra progetti', () => {
      // Progetto 1
      service.addOptimisticTechnology(1, mockTech1);
      
      // Navigate to Project 2
      service.addOptimisticTechnology(2, mockTech3);

      // Torna a Project 1 - tecnologie dovrebbero persistere
      expect(service.getTechnologiesForProject(1).length).toBe(1);
      expect(service.getTechnologiesForProject(2).length).toBe(1);
    });

    it('dovrebbe pulire progetto quando si chiude modal', () => {
      service.addOptimisticTechnology(1, mockTech1);
      service.addOptimisticTechnology(1, mockTech2);

      // Chiusura modal
      service.clearProjectTechnologies(1);

      expect(service.getTechnologiesForProject(1).length).toBe(0);
    });
  });
});

/**
 * COPERTURA TEST OPTIMISTIC TECHNOLOGY SERVICE
 * ==============================================
 * 
 * ✅ Creazione servizio
 * ✅ getTechnologiesForProject() - vuoto, con tech, multiple projects, projectId=0
 * ✅ addOptimisticTechnology() - add, multiple, ordine, null desc, tempId, preserve fields
 * ✅ removeOptimisticTechnology() - remove, solo specificato, altri progetti, non esiste, ordine
 * ✅ markAsRemoving() - marca, non altre, non esiste, preserve fields
 * ✅ isPending() - false/true, case-insensitive, progetti diversi, parziali, spazi
 * ✅ cleanupOldTechnologies() - recenti OK, vecchie remove, multiple, mix, empty
 * ✅ clearProjectTechnologies() - clear all, non altri, non esiste, multiple
 * ✅ Multiple projects - gestione, operazioni isolate, clear specifico
 * ✅ Edge cases (caratteri speciali, stringhe lunghe, id grandi)
 * ✅ Performance (100 tech < 100ms, 50 progetti < 100ms, rimozione < 50ms)
 * ✅ Service persistence (singleton, stato persiste)
 * ✅ Workflow reale (add/remove, fallimenti, duplicati, navigation, chiusura modal)
 * 
 * COVERAGE STIMATA: ~100% del servizio
 * 
 * TOTALE: +50 nuovi test complessi per OptimisticTechnologyService
 * 
 * Pattern critici testati:
 * - State management con signals e Map
 * - Isolation tra progetti
 * - Pending call tracking
 * - Cleanup automatico
 * - Optimistic UI workflows
 * - Performance con large datasets
 */

