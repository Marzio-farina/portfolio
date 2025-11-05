import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Contatti, NotificationItem } from './contatti';
import { NotificationType } from '../../components/notification/notification';

describe('Contatti', () => {
  let component: Contatti;
  let fixture: ComponentFixture<Contatti>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    // Setup mock per ActivatedRoute
    mockActivatedRoute = {
      data: of({ title: 'Contatti' }),
      snapshot: {
        paramMap: new Map()
      }
    };

    await TestBed.configureTestingModule({
      imports: [Contatti],
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Contatti);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('dovrebbe avere properties definite', () => {
      expect(component.notifications).toBeDefined();
      expect(component.showMultipleNotifications).toBeDefined();
      expect(component.title).toBeDefined();
    });

    it('dovrebbe inizializzare con array notifiche vuoto', () => {
      expect(component.notifications().length).toBe(0);
    });

    it('showMultipleNotifications dovrebbe essere false all\'init', () => {
      expect(component.showMultipleNotifications).toBe(false);
    });

    it('dovrebbe caricare il titolo dalla route', (done) => {
      setTimeout(() => {
        expect(component.title()).toBe('Contatti');
        done();
      }, 0);
    });
  });

  describe('Error Management - onErrorChange', () => {
    it('dovrebbe aggiungere notifica di errore', () => {
      const errorData = {
        message: 'Email non valida',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'add' as const
      };

      component.onErrorChange(errorData);

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].message).toBe('Email non valida');
      expect(component.notifications()[0].type).toBe('error');
      expect(component.notifications()[0].fieldId).toBe('email');
    });

    it('dovrebbe aggiungere notifica di warning', () => {
      const warningData = {
        message: 'Campo opzionale consigliato',
        type: 'warning' as NotificationType,
        fieldId: 'phone',
        action: 'add' as const
      };

      component.onErrorChange(warningData);

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].type).toBe('warning');
    });

    it('dovrebbe rimuovere notifica per campo specifico', () => {
      // Prima aggiungi
      const errorData = {
        message: 'Errore campo nome',
        type: 'error' as NotificationType,
        fieldId: 'name',
        action: 'add' as const
      };
      component.onErrorChange(errorData);
      expect(component.notifications().length).toBe(1);

      // Poi rimuovi
      const removeData = {
        message: '',
        type: 'error' as NotificationType,
        fieldId: 'name',
        action: 'remove' as const
      };
      component.onErrorChange(removeData);

      expect(component.notifications().length).toBe(0);
    });

    it('non dovrebbe aggiungere notifiche duplicate con stesso messaggio', () => {
      const errorData = {
        message: 'Stesso errore',
        type: 'error' as NotificationType,
        fieldId: 'test',
        action: 'add' as const
      };

      component.onErrorChange(errorData);
      component.onErrorChange(errorData);

      expect(component.notifications().length).toBe(1);
    });

    it('dovrebbe sostituire notifica precedente per stesso campo', () => {
      // Prima notifica
      const error1 = {
        message: 'Errore 1',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'add' as const
      };
      component.onErrorChange(error1);
      expect(component.notifications().length).toBe(1);

      // Seconda notifica per stesso campo
      const error2 = {
        message: 'Errore 2',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'add' as const
      };
      component.onErrorChange(error2);

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].message).toBe('Errore 2');
    });

    it('dovrebbe impostare showMultipleNotifications a true quando aggiunge notifica', () => {
      const errorData = {
        message: 'Test error',
        type: 'error' as NotificationType,
        fieldId: 'test',
        action: 'add' as const
      };

      component.onErrorChange(errorData);

      expect(component.showMultipleNotifications).toBe(true);
    });

    it('dovrebbe gestire undefined gracefully', () => {
      const initialLength = component.notifications().length;
      
      component.onErrorChange(undefined);

      expect(component.notifications().length).toBe(initialLength);
    });

    it('dovrebbe gestire notifiche multiple per campi diversi', () => {
      const error1 = {
        message: 'Errore nome',
        type: 'error' as NotificationType,
        fieldId: 'name',
        action: 'add' as const
      };
      const error2 = {
        message: 'Errore email',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'add' as const
      };

      component.onErrorChange(error1);
      component.onErrorChange(error2);

      expect(component.notifications().length).toBe(2);
    });
  });

  describe('Success Management - onSuccessChange', () => {
    it('dovrebbe aggiungere notifica di successo', () => {
      component.onSuccessChange('Messaggio inviato con successo!');

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].message).toBe('Messaggio inviato con successo!');
      expect(component.notifications()[0].type).toBe('success');
      expect(component.notifications()[0].fieldId).toBe('success');
    });

    it('non dovrebbe aggiungere notifica se success è undefined', () => {
      component.onSuccessChange(undefined);

      expect(component.notifications().length).toBe(0);
    });

    it('non dovrebbe aggiungere notifiche di successo duplicate', () => {
      component.onSuccessChange('Stesso messaggio');
      component.onSuccessChange('Stesso messaggio');

      expect(component.notifications().length).toBe(1);
    });

    it('dovrebbe impostare showMultipleNotifications a true', () => {
      component.onSuccessChange('Successo!');

      expect(component.showMultipleNotifications).toBe(true);
    });

    it('dovrebbe gestire stringhe vuote', () => {
      component.onSuccessChange('');

      expect(component.notifications().length).toBe(0);
    });

    it('dovrebbe aggiungere multiple notifiche di successo con messaggi diversi', () => {
      component.onSuccessChange('Successo 1');
      component.onSuccessChange('Successo 2');

      expect(component.notifications().length).toBe(2);
    });

    it('dovrebbe generare ID univoci per ogni notifica', () => {
      component.onSuccessChange('Test 1');
      component.onSuccessChange('Test 2');

      const ids = component.notifications().map(n => n.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Most Severe Notification - getMostSevereNotification', () => {
    it('dovrebbe restituire null quando non ci sono notifiche', () => {
      const result = component.getMostSevereNotification();
      
      expect(result).toBeNull();
    });

    it('dovrebbe restituire error come più grave', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' },
        { id: '2', message: 'Error', type: 'error', timestamp: Date.now(), fieldId: 'test2' },
        { id: '3', message: 'Info', type: 'info', timestamp: Date.now(), fieldId: 'test3' }
      ]);

      const result = component.getMostSevereNotification();
      
      expect(result?.type).toBe('error');
      expect(result?.message).toBe('Error');
    });

    it('dovrebbe restituire warning quando non ci sono errori', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' },
        { id: '2', message: 'Warning', type: 'warning', timestamp: Date.now(), fieldId: 'test2' },
        { id: '3', message: 'Info', type: 'info', timestamp: Date.now(), fieldId: 'test3' }
      ]);

      const result = component.getMostSevereNotification();
      
      expect(result?.type).toBe('warning');
    });

    it('dovrebbe restituire info quando non ci sono errori o warning', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' },
        { id: '2', message: 'Info', type: 'info', timestamp: Date.now(), fieldId: 'test2' }
      ]);

      const result = component.getMostSevereNotification();
      
      expect(result?.type).toBe('info');
    });

    it('dovrebbe restituire success quando è l\'unica notifica', () => {
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' }
      ]);

      const result = component.getMostSevereNotification();
      
      expect(result?.type).toBe('success');
    });

    it('dovrebbe seguire ordine di gravità: error > warning > info > success', () => {
      // Solo success e info
      component.notifications.set([
        { id: '1', message: 'Success', type: 'success', timestamp: Date.now(), fieldId: 'test1' },
        { id: '2', message: 'Info', type: 'info', timestamp: Date.now(), fieldId: 'test2' }
      ]);
      expect(component.getMostSevereNotification()?.type).toBe('info');

      // Aggiungi warning
      component.notifications.set([
        ...component.notifications(),
        { id: '3', message: 'Warning', type: 'warning', timestamp: Date.now(), fieldId: 'test3' }
      ]);
      expect(component.getMostSevereNotification()?.type).toBe('warning');

      // Aggiungi error
      component.notifications.set([
        ...component.notifications(),
        { id: '4', message: 'Error', type: 'error', timestamp: Date.now(), fieldId: 'test4' }
      ]);
      expect(component.getMostSevereNotification()?.type).toBe('error');
    });
  });

  describe('Form Validation Scenarios', () => {
    it('dovrebbe gestire errore email invalida', () => {
      const emailError = {
        message: 'Formato email non valido',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'add' as const
      };

      component.onErrorChange(emailError);

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].fieldId).toBe('email');
    });

    it('dovrebbe gestire errore campo richiesto', () => {
      const requiredError = {
        message: 'Campo obbligatorio',
        type: 'error' as NotificationType,
        fieldId: 'name',
        action: 'add' as const
      };

      component.onErrorChange(requiredError);

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].message).toBe('Campo obbligatorio');
    });

    it('dovrebbe gestire errore lunghezza minima', () => {
      const minLengthError = {
        message: 'Minimo 10 caratteri richiesti',
        type: 'error' as NotificationType,
        fieldId: 'message',
        action: 'add' as const
      };

      component.onErrorChange(minLengthError);

      expect(component.notifications().length).toBe(1);
    });

    it('dovrebbe gestire validazione multipla campi', () => {
      component.onErrorChange({
        message: 'Nome richiesto',
        type: 'error' as NotificationType,
        fieldId: 'name',
        action: 'add' as const
      });
      component.onErrorChange({
        message: 'Email richiesta',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'add' as const
      });
      component.onErrorChange({
        message: 'Messaggio richiesto',
        type: 'error' as NotificationType,
        fieldId: 'message',
        action: 'add' as const
      });

      expect(component.notifications().length).toBe(3);
    });

    it('dovrebbe pulire errori quando campo diventa valido', () => {
      // Aggiungi errore
      component.onErrorChange({
        message: 'Email non valida',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'add' as const
      });
      expect(component.notifications().length).toBe(1);

      // Rimuovi errore (campo ora valido)
      component.onErrorChange({
        message: '',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'remove' as const
      });
      expect(component.notifications().length).toBe(0);
    });
  });

  describe('Form Submission Scenarios', () => {
    it('dovrebbe mostrare successo dopo invio corretto', () => {
      component.onSuccessChange('Il tuo messaggio è stato inviato con successo!');

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].type).toBe('success');
    });

    it('dovrebbe gestire errore di invio', () => {
      const submitError = {
        message: 'Errore durante l\'invio. Riprova più tardi.',
        type: 'error' as NotificationType,
        fieldId: 'submit',
        action: 'add' as const
      };

      component.onErrorChange(submitError);

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].type).toBe('error');
    });

    it('dovrebbe gestire errore di rete', () => {
      const networkError = {
        message: 'Errore di connessione. Verifica la tua connessione internet.',
        type: 'error' as NotificationType,
        fieldId: 'network',
        action: 'add' as const
      };

      component.onErrorChange(networkError);

      expect(component.notifications().length).toBe(1);
    });

    it('dovrebbe gestire timeout', () => {
      const timeoutError = {
        message: 'La richiesta ha impiegato troppo tempo. Riprova.',
        type: 'warning' as NotificationType,
        fieldId: 'timeout',
        action: 'add' as const
      };

      component.onErrorChange(timeoutError);

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].type).toBe('warning');
    });

    it('dovrebbe gestire errore server 500', () => {
      const serverError = {
        message: 'Errore del server. Riprova tra qualche minuto.',
        type: 'error' as NotificationType,
        fieldId: 'server',
        action: 'add' as const
      };

      component.onErrorChange(serverError);

      expect(component.notifications().length).toBe(1);
    });
  });

  describe('Notification Lifecycle', () => {
    it('dovrebbe generare timestamp corretti', () => {
      const before = Date.now();
      
      component.onSuccessChange('Test');
      
      const after = Date.now();
      const notification = component.notifications()[0];

      expect(notification.timestamp).toBeGreaterThanOrEqual(before);
      expect(notification.timestamp).toBeLessThanOrEqual(after);
    });

    it('dovrebbe mantenere ordine di inserimento', () => {
      component.onSuccessChange('First');
      component.onSuccessChange('Second');
      component.onSuccessChange('Third');

      expect(component.notifications()[0].message).toBe('First');
      expect(component.notifications()[1].message).toBe('Second');
      expect(component.notifications()[2].message).toBe('Third');
    });

    it('dovrebbe permettere aggiunta dopo rimozione', () => {
      // Aggiungi
      component.onErrorChange({
        message: 'Error 1',
        type: 'error' as NotificationType,
        fieldId: 'test',
        action: 'add' as const
      });
      expect(component.notifications().length).toBe(1);

      // Rimuovi
      component.onErrorChange({
        message: '',
        type: 'error' as NotificationType,
        fieldId: 'test',
        action: 'remove' as const
      });
      expect(component.notifications().length).toBe(0);

      // Aggiungi di nuovo
      component.onErrorChange({
        message: 'Error 2',
        type: 'error' as NotificationType,
        fieldId: 'test',
        action: 'add' as const
      });
      expect(component.notifications().length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire messaggi molto lunghi', () => {
      const longMessage = 'A'.repeat(1000);
      
      component.onSuccessChange(longMessage);

      expect(component.notifications()[0].message.length).toBe(1000);
    });

    it('dovrebbe gestire caratteri speciali nei messaggi', () => {
      const specialChars = 'Test <script>alert("xss")</script> 特殊文字 émojis 🎉';
      
      component.onSuccessChange(specialChars);

      expect(component.notifications()[0].message).toBe(specialChars);
    });

    it('dovrebbe gestire notifiche con fieldId identici ma azioni diverse', () => {
      // Add
      component.onErrorChange({
        message: 'Error',
        type: 'error' as NotificationType,
        fieldId: 'same-id',
        action: 'add' as const
      });
      
      // Remove
      component.onErrorChange({
        message: '',
        type: 'error' as NotificationType,
        fieldId: 'same-id',
        action: 'remove' as const
      });

      expect(component.notifications().length).toBe(0);
    });

    it('dovrebbe gestire rimozione di notifica inesistente', () => {
      component.onErrorChange({
        message: '',
        type: 'error' as NotificationType,
        fieldId: 'non-existent',
        action: 'remove' as const
      });

      expect(component.notifications().length).toBe(0);
    });

    it('dovrebbe gestire molte notifiche simultanee', () => {
      for (let i = 0; i < 100; i++) {
        component.onSuccessChange(`Message ${i}`);
      }

      expect(component.notifications().length).toBe(100);
    });

    it('dovrebbe gestire tipi di notifica misti', () => {
      component.onSuccessChange('Success message');
      component.onErrorChange({
        message: 'Error message',
        type: 'error' as NotificationType,
        fieldId: 'error1',
        action: 'add' as const
      });
      component.onErrorChange({
        message: 'Warning message',
        type: 'warning' as NotificationType,
        fieldId: 'warn1',
        action: 'add' as const
      });
      component.onErrorChange({
        message: 'Info message',
        type: 'info' as NotificationType,
        fieldId: 'info1',
        action: 'add' as const
      });

      expect(component.notifications().length).toBe(4);
      
      // Verifica che getMostSevereNotification restituisca error
      const most = component.getMostSevereNotification();
      expect(most?.type).toBe('error');
    });
  });

  describe('Signals State', () => {
    it('notifications signal dovrebbe essere reattivo', () => {
      const notification: NotificationItem = {
        id: 'test-1',
        message: 'Test',
        type: 'info',
        timestamp: Date.now(),
        fieldId: 'test'
      };

      component.notifications.set([notification]);
      
      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].id).toBe('test-1');
    });

    it('dovrebbe permettere reset delle notifiche', () => {
      component.onSuccessChange('Test 1');
      component.onSuccessChange('Test 2');
      expect(component.notifications().length).toBe(2);

      component.notifications.set([]);
      expect(component.notifications().length).toBe(0);
    });
  });

  describe('Integration with Contact Form', () => {
    it('dovrebbe gestire flusso completo di validazione form', () => {
      // Errori iniziali
      component.onErrorChange({
        message: 'Nome richiesto',
        type: 'error' as NotificationType,
        fieldId: 'name',
        action: 'add' as const
      });
      component.onErrorChange({
        message: 'Email richiesta',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'add' as const
      });
      expect(component.notifications().length).toBe(2);

      // Utente compila nome correttamente
      component.onErrorChange({
        message: '',
        type: 'error' as NotificationType,
        fieldId: 'name',
        action: 'remove' as const
      });
      expect(component.notifications().length).toBe(1);

      // Utente compila email correttamente
      component.onErrorChange({
        message: '',
        type: 'error' as NotificationType,
        fieldId: 'email',
        action: 'remove' as const
      });
      expect(component.notifications().length).toBe(0);

      // Invio con successo
      component.onSuccessChange('Messaggio inviato!');
      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].type).toBe('success');
    });

    it('dovrebbe gestire flusso di errore di invio', () => {
      // Form valido, ma errore di rete
      component.onErrorChange({
        message: 'Errore di connessione',
        type: 'error' as NotificationType,
        fieldId: 'submit',
        action: 'add' as const
      });

      expect(component.notifications().length).toBe(1);
      expect(component.notifications()[0].type).toBe('error');
    });
  });
});
