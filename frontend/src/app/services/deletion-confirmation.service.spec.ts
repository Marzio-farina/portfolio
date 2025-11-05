import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DestroyRef } from '@angular/core';
import { of, throwError, delay as rxDelay, timer } from 'rxjs';
import { DeletionConfirmationService } from './deletion-confirmation.service';

/**
 * Test Suite Completa per DeletionConfirmationService
 * 
 * Servizio critico per conferma cancellazione con pattern X → ↩
 * COMPORTAMENTO COMPLESSO:
 * 1. Primo click X → Overlay + DELETE con delay
 * 2. Click ↩ prima di DELETE → Annulla subscription
 * 3. Click ↩ dopo DELETE → Chiama RESTORE
 */
describe('DeletionConfirmationService', () => {
  let service: DeletionConfirmationService;
  let mockDestroyRef: DestroyRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DeletionConfirmationService]
    });
    
    service = TestBed.inject(DeletionConfirmationService);
    
    // Mock DestroyRef
    mockDestroyRef = {
      onDestroy: jasmine.createSpy('onDestroy')
    } as any;
  });

  // ========================================
  // TEST: Creazione e Inizializzazione
  // ========================================
  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize()', () => {
    it('dovrebbe inizializzare con DestroyRef', () => {
      expect(() => service.initialize(mockDestroyRef)).not.toThrow();
    });

    it('dovrebbe impostare deleteDelay', () => {
      service.initialize(mockDestroyRef, 500);
      // deleteDelay è privato, ma il comportamento sarà testato nei test di delay
    });

    it('dovrebbe funzionare con deleteDelay = 0', () => {
      expect(() => service.initialize(mockDestroyRef, 0)).not.toThrow();
    });

    it('dovrebbe funzionare senza deleteDelay (default 0)', () => {
      expect(() => service.initialize(mockDestroyRef)).not.toThrow();
    });
  });

  // ========================================
  // TEST: isDeleting e deletingClass
  // ========================================
  describe('Computed Signals', () => {
    it('isDeleting dovrebbe iniziare false', () => {
      expect(service.isDeleting()).toBe(false);
    });

    it('deletingClass dovrebbe iniziare vuoto', () => {
      expect(service.deletingClass()).toBe('');
    });

    it('deletingClass dovrebbe diventare "is-deleting" durante cancellazione', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(50));
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, () => {});
      
      expect(service.isDeleting()).toBe(true);
      expect(service.deletingClass()).toBe('is-deleting');
      
      setTimeout(() => {
        expect(service.isDeleting()).toBe(false);
        expect(service.deletingClass()).toBe('');
        done();
      }, 100);
    });
  });

  // ========================================
  // TEST: handleAdminClick() - Primo Click
  // ========================================
  describe('handleAdminClick() - Primo Click (DELETE)', () => {
    it('dovrebbe attivare stato deleting', () => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(100));
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, () => {});
      
      expect(service.isDeleting()).toBe(true);
    });

    it('dovrebbe chiamare onDeleted quando DELETE completa', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const onDeleted = jasmine.createSpy('onDeleted');
      
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      
      setTimeout(() => {
        expect(onDeleted).toHaveBeenCalledWith(1);
        done();
      }, 10);
    });

    it('dovrebbe chiamare onError quando DELETE fallisce', (done) => {
      service.initialize(mockDestroyRef);
      
      const error = new Error('DELETE failed');
      const deleteApi$ = throwError(() => error);
      const onError = jasmine.createSpy('onError');
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, onError);
      
      setTimeout(() => {
        expect(onError).toHaveBeenCalledWith(error);
        done();
      }, 10);
    });

    it('dovrebbe resettare stato dopo DELETE completata', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, () => {});
      
      expect(service.isDeleting()).toBe(true);
      
      setTimeout(() => {
        expect(service.isDeleting()).toBe(false);
        done();
      }, 10);
    });

    it('dovrebbe resettare stato dopo DELETE fallita', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = throwError(() => new Error('Fail'));
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, () => {});
      
      expect(service.isDeleting()).toBe(true);
      
      setTimeout(() => {
        expect(service.isDeleting()).toBe(false);
        done();
      }, 10);
    });
  });

  // ========================================
  // TEST: handleAdminClick() - Secondo Click (CANCEL)
  // ========================================
  describe('handleAdminClick() - Secondo Click (CANCEL prima di DELETE)', () => {
    it('dovrebbe annullare DELETE in corso', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(100));
      const onDeleted = jasmine.createSpy('onDeleted');
      
      // Primo click
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      expect(service.isDeleting()).toBe(true);
      
      // Secondo click immediato (annulla)
      service.handleAdminClick(1, of(true), null, () => {}, () => {});
      expect(service.isDeleting()).toBe(false);
      
      // Aspetta per verificare che DELETE non venga eseguita
      setTimeout(() => {
        expect(onDeleted).not.toHaveBeenCalled();
        done();
      }, 150);
    });

    it('non dovrebbe chiamare RESTORE se DELETE annullata', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(100));
      const restoreApi$ = of({ id: 1, restored: true });
      const onRestored = jasmine.createSpy('onRestored');
      
      // Primo click
      service.handleAdminClick(1, deleteApi$, restoreApi$, () => {}, () => {}, onRestored);
      
      // Annulla prima che DELETE completi
      service.handleAdminClick(1, of(true), restoreApi$, () => {}, () => {}, onRestored);
      
      setTimeout(() => {
        expect(onRestored).not.toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  // ========================================
  // TEST: handleAdminClick() - RESTORE dopo DELETE
  // ========================================
  describe('handleAdminClick() - RESTORE dopo DELETE completata', () => {
    it('dovrebbe chiamare RESTORE se DELETE completata', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const restored = { id: 1, title: 'Restored Item' };
      const restoreApi$ = of(restored).pipe(rxDelay(10));
      const onRestored = jasmine.createSpy('onRestored');
      
      // Primo click - DELETE
      service.handleAdminClick(1, deleteApi$, restoreApi$, () => {}, () => {}, onRestored);
      
      // Aspetta che DELETE completi
      setTimeout(() => {
        // Secondo click - RESTORE
        service.handleAdminClick(1, of(true), restoreApi$, () => {}, () => {}, onRestored);
        
        // Aspetta RESTORE
        setTimeout(() => {
          expect(onRestored).toHaveBeenCalledWith(restored);
          done();
        }, 50);
      }, 20);
    });

    it('non dovrebbe chiamare RESTORE se restoreApi$ è null', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const onRestored = jasmine.createSpy('onRestored');
      
      // Primo click
      service.handleAdminClick(1, deleteApi$, null, () => {}, () => {}, onRestored);
      
      setTimeout(() => {
        // Secondo click senza restoreApi$
        service.handleAdminClick(1, of(true), null, () => {}, () => {}, onRestored);
        
        setTimeout(() => {
          expect(onRestored).not.toHaveBeenCalled();
          done();
        }, 20);
      }, 20);
    });

    it('dovrebbe gestire errore in RESTORE', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const restoreApi$ = throwError(() => new Error('RESTORE failed'));
      const onRestored = jasmine.createSpy('onRestored');
      
      // Mock console.error per non inquinare output test
      spyOn(console, 'error');
      
      // Primo click
      service.handleAdminClick(1, deleteApi$, restoreApi$, () => {}, () => {}, onRestored);
      
      setTimeout(() => {
        // Secondo click - RESTORE che fallisce
        service.handleAdminClick(1, of(true), restoreApi$, () => {}, () => {}, onRestored);
        
        setTimeout(() => {
          expect(onRestored).not.toHaveBeenCalled();
          expect(console.error).toHaveBeenCalled();
          done();
        }, 50);
      }, 20);
    });
  });

  // ========================================
  // TEST: deleteDelay
  // ========================================
  describe('DELETE con Delay', () => {
    it('dovrebbe ritardare DELETE se deleteDelay > 0', fakeAsync(() => {
      service.initialize(mockDestroyRef, 500); // 500ms delay
      
      const deleteApi$ = of(true);
      const onDeleted = jasmine.createSpy('onDeleted');
      
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      
      expect(service.isDeleting()).toBe(true);
      
      // Prima dei 500ms, DELETE non dovrebbe essere eseguita
      tick(400);
      expect(onDeleted).not.toHaveBeenCalled();
      
      // Dopo 500ms, DELETE dovrebbe completare
      tick(100);
      expect(onDeleted).toHaveBeenCalled();
    }));

    it('dovrebbe permettere annullamento durante delay', fakeAsync(() => {
      service.initialize(mockDestroyRef, 500);
      
      const deleteApi$ = of(true);
      const onDeleted = jasmine.createSpy('onDeleted');
      
      // Primo click
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      
      // Annulla a metà delay
      tick(250);
      service.handleAdminClick(1, of(true), null, () => {}, () => {});
      
      // Aspetta il resto del delay
      tick(250);
      
      // DELETE non dovrebbe essere eseguita
      expect(onDeleted).not.toHaveBeenCalled();
      expect(service.isDeleting()).toBe(false);
    }));

    it('dovrebbe eseguire DELETE immediatamente se delay = 0', fakeAsync(() => {
      service.initialize(mockDestroyRef, 0);
      
      const deleteApi$ = of(true);
      const onDeleted = jasmine.createSpy('onDeleted');
      
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      
      tick();
      
      expect(onDeleted).toHaveBeenCalled();
    }));
  });

  // ========================================
  // TEST: reset()
  // ========================================
  describe('reset()', () => {
    it('dovrebbe resettare completamente lo stato', () => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(100));
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, () => {});
      expect(service.isDeleting()).toBe(true);
      
      service.reset();
      expect(service.isDeleting()).toBe(false);
    });

    it('dovrebbe annullare DELETE in corso', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(100));
      const onDeleted = jasmine.createSpy('onDeleted');
      
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      
      service.reset();
      
      setTimeout(() => {
        expect(onDeleted).not.toHaveBeenCalled();
        done();
      }, 150);
    });

    it('dovrebbe funzionare multiple volte', () => {
      service.initialize(mockDestroyRef);
      
      service.reset();
      service.reset();
      service.reset();
      
      expect(service.isDeleting()).toBe(false);
    });

    it('dovrebbe funzionare senza inizializzazione', () => {
      expect(() => service.reset()).not.toThrow();
    });
  });

  // ========================================
  // TEST: shouldPreventAction()
  // ========================================
  describe('shouldPreventAction()', () => {
    it('dovrebbe ritornare false inizialmente', () => {
      expect(service.shouldPreventAction()).toBe(false);
    });

    it('dovrebbe ritornare true durante cancellazione', () => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(100));
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, () => {});
      
      expect(service.shouldPreventAction()).toBe(true);
    });

    it('dovrebbe ritornare false dopo cancellazione completata', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, () => {});
      
      setTimeout(() => {
        expect(service.shouldPreventAction()).toBe(false);
        done();
      }, 20);
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire id = 0', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const onDeleted = jasmine.createSpy('onDeleted');
      
      service.handleAdminClick(0, deleteApi$, null, onDeleted, () => {});
      
      setTimeout(() => {
        expect(onDeleted).toHaveBeenCalledWith(0);
        done();
      }, 10);
    });

    it('dovrebbe gestire id negativo', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const onDeleted = jasmine.createSpy('onDeleted');
      
      service.handleAdminClick(-1, deleteApi$, null, onDeleted, () => {});
      
      setTimeout(() => {
        expect(onDeleted).toHaveBeenCalledWith(-1);
        done();
      }, 10);
    });

    it('dovrebbe gestire id molto grande', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const onDeleted = jasmine.createSpy('onDeleted');
      
      service.handleAdminClick(999999, deleteApi$, null, onDeleted, () => {});
      
      setTimeout(() => {
        expect(onDeleted).toHaveBeenCalledWith(999999);
        done();
      }, 10);
    });

    it('dovrebbe gestire onRestored undefined', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const restoreApi$ = of({ id: 1 });
      
      // onRestored è undefined
      service.handleAdminClick(1, deleteApi$, restoreApi$, () => {}, () => {}, undefined);
      
      setTimeout(() => {
        service.handleAdminClick(1, of(true), restoreApi$, () => {}, () => {}, undefined);
        
        setTimeout(() => {
          expect(service.isDeleting()).toBe(false);
          done();
        }, 20);
      }, 20);
    });
  });

  // ========================================
  // TEST: Multiple Clicks rapidi
  // ========================================
  describe('Multiple Clicks Rapidi', () => {
    it('dovrebbe gestire 3 click rapidi (delete, cancel, delete)', fakeAsync(() => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(50));
      const onDeleted = jasmine.createSpy('onDeleted');
      
      // Click 1: DELETE
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      expect(service.isDeleting()).toBe(true);
      
      tick(20);
      
      // Click 2: CANCEL
      service.handleAdminClick(1, of(true), null, () => {}, () => {});
      expect(service.isDeleting()).toBe(false);
      
      tick(20);
      
      // Click 3: nuovo DELETE
      service.handleAdminClick(1, of(true), null, onDeleted, () => {});
      expect(service.isDeleting()).toBe(true);
      
      tick(20);
      
      expect(onDeleted).toHaveBeenCalledTimes(1);
    }));
  });

  // ========================================
  // TEST: Real World Workflows
  // ========================================
  describe('Real World Workflows', () => {
    it('dovrebbe gestire workflow: click X → attesa → DELETE completa', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const onDeleted = jasmine.createSpy('onDeleted');
      
      // User clicca X
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      expect(service.isDeleting()).toBe(true);
      
      // DELETE completa
      setTimeout(() => {
        expect(service.isDeleting()).toBe(false);
        expect(onDeleted).toHaveBeenCalledWith(1);
        done();
      }, 20);
    });

    it('dovrebbe gestire workflow: click X → click ↩ → annullamento', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true).pipe(rxDelay(100));
      const onDeleted = jasmine.createSpy('onDeleted');
      
      // User clicca X
      service.handleAdminClick(1, deleteApi$, null, onDeleted, () => {});
      expect(service.isDeleting()).toBe(true);
      
      // User clicca ↩ (cambia idea)
      setTimeout(() => {
        service.handleAdminClick(1, of(true), null, () => {}, () => {});
        expect(service.isDeleting()).toBe(false);
        
        // Verifica che DELETE non sia stata eseguita
        setTimeout(() => {
          expect(onDeleted).not.toHaveBeenCalled();
          done();
        }, 100);
      }, 20);
    });

    it('dovrebbe gestire workflow: click X → DELETE → click ↩ → RESTORE', (done) => {
      service.initialize(mockDestroyRef);
      
      const deleteApi$ = of(true);
      const restored = { id: 1, title: 'Item' };
      const restoreApi$ = of(restored);
      const onDeleted = jasmine.createSpy('onDeleted');
      const onRestored = jasmine.createSpy('onRestored');
      
      // Click X - DELETE
      service.handleAdminClick(1, deleteApi$, restoreApi$, onDeleted, () => {}, onRestored);
      
      // DELETE completa
      setTimeout(() => {
        expect(onDeleted).toHaveBeenCalled();
        
        // Click ↩ - RESTORE
        service.handleAdminClick(1, of(true), restoreApi$, () => {}, () => {}, onRestored);
        
        // RESTORE completa
        setTimeout(() => {
          expect(onRestored).toHaveBeenCalledWith(restored);
          done();
        }, 20);
      }, 20);
    });

    it('dovrebbe gestire errore durante DELETE con feedback', (done) => {
      service.initialize(mockDestroyRef);
      
      const error = new Error('Network error');
      const deleteApi$ = throwError(() => error);
      const onError = jasmine.createSpy('onError');
      
      service.handleAdminClick(1, deleteApi$, null, () => {}, onError);
      
      setTimeout(() => {
        expect(onError).toHaveBeenCalledWith(error);
        expect(service.isDeleting()).toBe(false);
        done();
      }, 10);
    });
  });
});

/**
 * COPERTURA TEST DELETION CONFIRMATION SERVICE
 * =============================================
 * 
 * ✅ Creazione e inizializzazione (4 test)
 * ✅ Computed signals (isDeleting, deletingClass) (3 test)
 * ✅ handleAdminClick - Primo click DELETE (5 test)
 * ✅ handleAdminClick - Secondo click CANCEL prima di DELETE (2 test)
 * ✅ handleAdminClick - RESTORE dopo DELETE (3 test)
 * ✅ DELETE con delay (3 test)
 * ✅ reset() (4 test)
 * ✅ shouldPreventAction() (3 test)
 * ✅ Edge cases (id=0, negativo, grande, onRestored undefined) (4 test)
 * ✅ Multiple clicks rapidi (1 test)
 * ✅ Real world workflows (DELETE, CANCEL, RESTORE, error) (4 test)
 * 
 * COVERAGE STIMATA: ~100% del servizio
 * 
 * TOTALE: +36 nuovi test complessi aggiunti
 * 
 * Pattern critici testati:
 * - DELETE con delay
 * - Annullamento prima/dopo DELETE
 * - RESTORE dopo DELETE completata
 * - Error handling DELETE/RESTORE
 * - Computed signals reattivi
 * - Multiple clicks rapidi
 * - Real-world UX workflows
 */

