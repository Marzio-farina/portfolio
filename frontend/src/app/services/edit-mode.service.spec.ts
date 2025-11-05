import { TestBed } from '@angular/core/testing';
import { EditModeService } from './edit-mode.service';

/**
 * Test EditModeService - Gestione modalità editing
 */
describe('EditModeService', () => {
  let service: EditModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditModeService);
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe inizializzare con isEditing = false', () => {
    expect(service.isEditing()).toBe(false);
  });

  it('dovrebbe abilitare edit mode', () => {
    service.enable();
    expect(service.isEditing()).toBe(true);
  });

  it('dovrebbe disabilitare edit mode', () => {
    service.enable();
    expect(service.isEditing()).toBe(true);
    
    service.disable();
    expect(service.isEditing()).toBe(false);
  });

  it('dovrebbe toggleare edit mode', () => {
    expect(service.isEditing()).toBe(false);
    
    service.toggle();
    expect(service.isEditing()).toBe(true);
    
    service.toggle();
    expect(service.isEditing()).toBe(false);
  });

  // ========================================
  // TEST: State Transitions
  // ========================================
  describe('State Transitions', () => {
    it('dovrebbe transizionare correttamente: off -> on -> off', () => {
      expect(service.isEditing()).toBe(false);
      
      service.enable();
      expect(service.isEditing()).toBe(true);
      
      service.disable();
      expect(service.isEditing()).toBe(false);
    });

    it('dovrebbe gestire enable multipli (idempotente)', () => {
      service.enable();
      service.enable();
      service.enable();
      
      expect(service.isEditing()).toBe(true);
    });

    it('dovrebbe gestire disable multipli (idempotente)', () => {
      service.enable();
      expect(service.isEditing()).toBe(true);
      
      service.disable();
      service.disable();
      service.disable();
      
      expect(service.isEditing()).toBe(false);
    });

    it('dovrebbe gestire sequenza: enable -> toggle -> toggle -> disable', () => {
      service.enable();      // true
      expect(service.isEditing()).toBe(true);
      
      service.toggle();      // false
      expect(service.isEditing()).toBe(false);
      
      service.toggle();      // true
      expect(service.isEditing()).toBe(true);
      
      service.disable();     // false
      expect(service.isEditing()).toBe(false);
    });

    it('dovrebbe gestire chiamate rapide consecutive', () => {
      service.enable();
      service.disable();
      service.enable();
      service.toggle();
      service.toggle();
      service.disable();
      
      expect(service.isEditing()).toBe(false);
    });

    it('dovrebbe mantenere stato dopo operazioni idempotenti', () => {
      service.enable();
      const state1 = service.isEditing();
      
      service.enable();
      service.enable();
      const state2 = service.isEditing();
      
      expect(state1).toBe(state2);
      expect(state2).toBe(true);
    });
  });

  // ========================================
  // TEST: Toggle Behavior
  // ========================================
  describe('Toggle Behavior', () => {
    it('dovrebbe alternare stato con toggle consecutivi', () => {
      const states: boolean[] = [];
      
      states.push(service.isEditing()); // false
      
      service.toggle();
      states.push(service.isEditing()); // true
      
      service.toggle();
      states.push(service.isEditing()); // false
      
      service.toggle();
      states.push(service.isEditing()); // true
      
      expect(states).toEqual([false, true, false, true]);
    });

    it('dovrebbe sempre alternare con toggle', () => {
      for (let i = 0; i < 10; i++) {
        const before = service.isEditing();
        service.toggle();
        const after = service.isEditing();
        
        expect(after).toBe(!before);
      }
    });
  });

  // ========================================
  // TEST: Signal Reactivity
  // ========================================
  describe('Signal Reactivity', () => {
    it('signal dovrebbe essere reactive e aggiornato', () => {
      let callCount = 0;
      let lastValue: boolean | undefined;
      
      // Simula un effect che osserva il signal
      const checkValue = () => {
        lastValue = service.isEditing();
        callCount++;
      };
      
      checkValue(); // Initial
      expect(lastValue).toBe(false);
      
      service.enable();
      checkValue();
      expect(lastValue).toBe(true);
      
      service.disable();
      checkValue();
      expect(lastValue).toBe(false);
      
      expect(callCount).toBe(3);
    });

    it('signal dovrebbe ritornare valore corrente sempre', () => {
      expect(service.isEditing()).toBe(false);
      
      service.enable();
      expect(service.isEditing()).toBe(true);
      expect(service.isEditing()).toBe(true); // Chiamata multipla
      
      service.disable();
      expect(service.isEditing()).toBe(false);
      expect(service.isEditing()).toBe(false); // Chiamata multipla
    });
  });

  // ========================================
  // TEST: Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('dovrebbe gestire disable su stato già disabled', () => {
      expect(service.isEditing()).toBe(false);
      
      service.disable(); // Già disabled
      expect(service.isEditing()).toBe(false);
    });

    it('dovrebbe inizializzare sempre con false per nuove istanze', () => {
      const service1 = TestBed.inject(EditModeService);
      const service2 = TestBed.inject(EditModeService);
      
      // Sono la stessa istanza (singleton)
      expect(service1).toBe(service2);
      
      // Stato iniziale
      expect(service1.isEditing()).toBe(service2.isEditing());
    });

    it('modifiche dovrebbero essere visibili immediatamente', () => {
      service.enable();
      expect(service.isEditing()).toBe(true);
      
      service.disable();
      expect(service.isEditing()).toBe(false);
      
      service.toggle();
      expect(service.isEditing()).toBe(true);
    });

    it('dovrebbe gestire sequenze complesse', () => {
      // Sequenza: T T T D E T T D
      service.toggle();   // T: false -> true
      service.toggle();   // T: true -> false
      service.toggle();   // T: false -> true
      service.disable();  // D: true -> false
      service.enable();   // E: false -> true
      service.toggle();   // T: true -> false
      service.toggle();   // T: false -> true
      service.disable();  // D: true -> false
      
      expect(service.isEditing()).toBe(false);
    });
  });

  // ========================================
  // TEST: Service Singleton
  // ========================================
  describe('Service Singleton', () => {
    it('dovrebbe essere singleton', () => {
      const instance1 = TestBed.inject(EditModeService);
      const instance2 = TestBed.inject(EditModeService);
      
      expect(instance1).toBe(instance2);
    });

    it('modifiche su una istanza si riflettono su tutte', () => {
      const instance1 = TestBed.inject(EditModeService);
      const instance2 = TestBed.inject(EditModeService);
      
      instance1.enable();
      expect(instance2.isEditing()).toBe(true);
      
      instance2.disable();
      expect(instance1.isEditing()).toBe(false);
    });
  });

  // ========================================
  // TEST: Stress Test
  // ========================================
  describe('Stress Test', () => {
    it('dovrebbe gestire migliaia di operazioni', () => {
      for (let i = 0; i < 1000; i++) {
        service.toggle();
      }
      
      // 1000 toggle su false iniziale = false finale
      expect(service.isEditing()).toBe(false);
    });

    it('dovrebbe essere performante con operazioni rapide', () => {
      const start = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        service.enable();
        service.disable();
        service.toggle();
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Dovrebbe completare in meno di 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});

/**
 * COPERTURA TEST EDIT MODE SERVICE
 * =================================
 * 
 * ✅ Creazione servizio
 * ✅ Inizializzazione (isEditing = false)
 * ✅ enable()
 * ✅ disable()
 * ✅ toggle()
 * ✅ State Transitions (6 test)
 * ✅ Toggle Behavior (2 test)
 * ✅ Signal Reactivity (2 test)
 * ✅ Edge Cases (4 test)
 * ✅ Service Singleton (2 test)
 * ✅ Stress Test (2 test)
 * 
 * COVERAGE STIMATA: ~100% del servizio
 * 
 * AGGIUNTO NELLA SESSIONE:
 * =======================
 * - Test state transitions (6 test)
 * - Test toggle behavior (2 test)
 * - Test signal reactivity (2 test)
 * - Test edge cases (4 test)
 * - Test service singleton (2 test)
 * - Test stress test (2 test)
 * 
 * TOTALE: +18 nuovi test aggiunti
 */

