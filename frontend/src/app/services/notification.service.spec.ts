import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { NotificationType } from '../components/notification/notification';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('dovrebbe essere creato', () => {
    expect(service).toBeTruthy();
  });

  describe('add', () => {
    it('dovrebbe aggiungere una notifica', () => {
      service.add('error', 'Messaggio di errore', 'test-field');
      
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].message).toBe('Messaggio di errore');
      expect(service.notifications()[0].type).toBe('error');
      expect(service.notifications()[0].fieldId).toBe('test-field');
    });

    it('dovrebbe sostituire notifica esistente con stesso fieldId', () => {
      service.add('error', 'Primo messaggio', 'test-field');
      service.add('warning', 'Secondo messaggio', 'test-field');
      
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].message).toBe('Secondo messaggio');
      expect(service.notifications()[0].type).toBe('warning');
    });

    it('dovrebbe mantenere notifiche multiple con fieldId diversi', () => {
      service.add('error', 'Errore 1', 'field1');
      service.add('warning', 'Warning 1', 'field2');
      
      expect(service.notifications().length).toBe(2);
    });

    it('dovrebbe generare ID univoci', () => {
      service.add('info', 'Messaggio 1', 'field1');
      service.add('info', 'Messaggio 2', 'field1');
      
      const notifications = service.notifications();
      expect(notifications[0].id).not.toBe(notifications[1].id);
    });
  });

  describe('remove', () => {
    it('dovrebbe rimuovere notifica per fieldId', () => {
      service.add('error', 'Messaggio 1', 'field1');
      service.add('warning', 'Messaggio 2', 'field2');
      
      service.remove('field1');
      
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].fieldId).toBe('field2');
    });

    it('dovrebbe gestire rimozione di fieldId non esistente', () => {
      service.add('error', 'Messaggio', 'field1');
      service.remove('field-inesistente');
      
      expect(service.notifications().length).toBe(1);
    });
  });

  describe('removeById', () => {
    it('dovrebbe rimuovere notifica per ID', () => {
      service.add('error', 'Messaggio 1', 'field1');
      const id = service.notifications()[0].id;
      
      service.removeById(id);
      
      expect(service.notifications().length).toBe(0);
    });
  });

  describe('clear', () => {
    it('dovrebbe rimuovere tutte le notifiche', () => {
      service.add('error', 'Messaggio 1', 'field1');
      service.add('warning', 'Messaggio 2', 'field2');
      
      service.clear();
      
      expect(service.notifications().length).toBe(0);
    });
  });

  describe('handleErrorChange', () => {
    it('dovrebbe aggiungere notifica con action add', () => {
      service.handleErrorChange({
        message: 'Errore',
        type: 'error',
        fieldId: 'test',
        action: 'add'
      });
      
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].message).toBe('Errore');
    });

    it('dovrebbe rimuovere notifica con action remove', () => {
      service.add('error', 'Errore', 'test');
      service.handleErrorChange({
        message: '',
        type: 'error',
        fieldId: 'test',
        action: 'remove'
      });
      
      expect(service.notifications().length).toBe(0);
    });

    it('dovrebbe gestire undefined gracefully', () => {
      service.add('error', 'Errore', 'test');
      service.handleErrorChange(undefined);
      
      expect(service.notifications().length).toBe(1);
    });
  });

  describe('addSuccess', () => {
    it('dovrebbe aggiungere notifica di successo', () => {
      service.addSuccess('Operazione completata');
      
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].type).toBe('success');
      expect(service.notifications()[0].message).toBe('Operazione completata');
    });

    it('non dovrebbe aggiungere duplicati con stesso messaggio', () => {
      service.addSuccess('Stesso messaggio');
      service.addSuccess('Stesso messaggio');
      
      expect(service.notifications().length).toBe(1);
    });

    it('dovrebbe aggiungere success con messaggi diversi', () => {
      service.addSuccess('Messaggio 1');
      service.addSuccess('Messaggio 2');
      
      expect(service.notifications().length).toBe(2);
    });
  });

  describe('getMostSevere', () => {
    it('dovrebbe restituire null se non ci sono notifiche', () => {
      expect(service.getMostSevere()).toBeNull();
    });

    it('dovrebbe restituire error come più grave', () => {
      service.add('success', 'Success', 's1');
      service.add('info', 'Info', 'i1');
      service.add('error', 'Error', 'e1');
      service.add('warning', 'Warning', 'w1');
      
      const mostSevere = service.getMostSevere();
      expect(mostSevere?.type).toBe('error');
    });

    it('dovrebbe restituire warning se non ci sono error', () => {
      service.add('success', 'Success', 's1');
      service.add('info', 'Info', 'i1');
      service.add('warning', 'Warning', 'w1');
      
      const mostSevere = service.getMostSevere();
      expect(mostSevere?.type).toBe('warning');
    });

    it('dovrebbe ordinare correttamente: error > warning > info > success', () => {
      service.add('info', 'Info', 'i1');
      service.add('success', 'Success', 's1');
      service.add('warning', 'Warning', 'w1');
      service.add('error', 'Error', 'e1');
      
      const mostSevere = service.getMostSevere();
      expect(mostSevere?.type).toBe('error');
    });
  });

  describe('showMultiple', () => {
    it('dovrebbe essere false quando non ci sono notifiche', () => {
      expect(service.showMultiple()).toBe(false);
    });

    it('dovrebbe essere true quando ci sono notifiche', () => {
      service.add('info', 'Messaggio', 'test');
      expect(service.showMultiple()).toBe(true);
    });
  });

  describe('auto-dismiss per success', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('dovrebbe rimuovere automaticamente notifiche di successo dopo delay', () => {
      service.add('success', 'Successo', 'test', true);
      expect(service.notifications().length).toBe(1);
      
      jasmine.clock().tick(4000);
      
      expect(service.notifications().length).toBe(0);
    });

    it('non dovrebbe rimuovere notifiche di successo se autoDismiss è false', () => {
      service.add('success', 'Successo', 'test', false);
      expect(service.notifications().length).toBe(1);
      
      jasmine.clock().tick(4000);
      
      expect(service.notifications().length).toBe(1);
    });
  });
});

