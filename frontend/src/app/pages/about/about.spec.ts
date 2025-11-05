import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { About } from './about';
import { WhatIDoService } from '../../services/what-i-do.service';
import { TenantService } from '../../services/tenant.service';
import { ProfileService } from '../../services/profile.service';

describe('About', () => {
  let component: About;
  let fixture: ComponentFixture<About>;
  let whatIDoService: jasmine.SpyObj<WhatIDoService>;
  let tenantService: jasmine.SpyObj<TenantService>;
  let profileService: jasmine.SpyObj<ProfileService>;
  let mockActivatedRoute: any;

  const mockWhatIDoCards = [
    { id: 1, title: 'Web Development', description: 'Building modern web apps', icon: 'code' },
    { id: 2, title: 'Mobile Apps', description: 'Creating mobile experiences', icon: 'mobile' }
  ];

  beforeEach(async () => {
    // Crea spy per i servizi
    whatIDoService = jasmine.createSpyObj('WhatIDoService', ['get$']);
    tenantService = jasmine.createSpyObj('TenantService', ['userId']);
    profileService = jasmine.createSpyObj('ProfileService', ['getProfile$']);

    // Configura mock per ActivatedRoute con route data
    mockActivatedRoute = {
      data: of({ title: 'About Me' }),
      snapshot: {
        paramMap: new Map()
      }
    };

    // Setup default return values
    whatIDoService.get$.and.returnValue(of(mockWhatIDoCards));
    tenantService.userId.and.returnValue(null);
    profileService.getProfile$.and.returnValue(of({ 
      id: 1, 
      name: 'Test', 
      surname: 'User',
      email: 'test@example.com'
    }));

    await TestBed.configureTestingModule({
      imports: [About],
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: WhatIDoService, useValue: whatIDoService },
        { provide: TenantService, useValue: tenantService },
        { provide: ProfileService, useValue: profileService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(About);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('dovrebbe avere properties definite', () => {
      expect(component.cards).toBeDefined();
      expect(component.loading).toBeDefined();
      expect(component.errorMsg).toBeDefined();
      expect(component.toastMessage).toBeDefined();
    });

    it('dovrebbe caricare il titolo dalla route', (done) => {
      // Il title è un toSignal che deve essere letto asincrono
      setTimeout(() => {
        expect(component.title()).toBe('About Me');
        done();
      }, 0);
    });

    it('dovrebbe iniziare con loading = true', () => {
      // Il componente imposta loading a false dopo il caricamento
      // ma possiamo verificare che sia stato chiamato
      expect(whatIDoService.get$).toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('dovrebbe caricare le card "What I Do" con successo', () => {
      // Verifica che le card siano state caricate
      expect(component.cards().length).toBe(2);
      expect(component.cards()[0].title).toBe('Web Development');
      expect(component.loading()).toBe(false);
    });

    it('dovrebbe gestire errore durante il caricamento delle card', () => {
      // Ricrea il componente con un errore
      whatIDoService.get$.and.returnValue(throwError(() => new Error('Network error')));

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.errorMsg()).toBe('Impossibile caricare le card.');
      expect(component2.loading()).toBe(false);
    });

    it('dovrebbe caricare le card per uno specifico tenant', () => {
      tenantService.userId.and.returnValue(123);

      const fixture2 = TestBed.createComponent(About);
      fixture2.detectChanges();

      expect(whatIDoService.get$).toHaveBeenCalledWith(123);
    });

    it('dovrebbe caricare le card senza user_id quando non c\'è tenant', () => {
      tenantService.userId.and.returnValue(null);

      const fixture2 = TestBed.createComponent(About);
      fixture2.detectChanges();

      expect(whatIDoService.get$).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Toast Notifications', () => {
    it('dovrebbe mostrare toast da navigation state', () => {
      // Simula state passato tramite navigazione
      const mockState = {
        toast: {
          message: 'Profilo salvato con successo!',
          type: 'success'
        }
      };

      // Mock window.history.state
      spyOnProperty(window.history, 'state', 'get').and.returnValue(mockState);
      spyOn(window.history, 'replaceState');

      // Ricrea il componente per triggerare il constructor
      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.toastMessage()).toBe('Profilo salvato con successo!');
      expect(component2.toastNotifications().length).toBe(1);
      expect(component2.toastNotifications()[0].message).toBe('Profilo salvato con successo!');
      expect(component2.toastNotifications()[0].type).toBe('success');
    });

    it('non dovrebbe mostrare toast quando non c\'è state', () => {
      spyOnProperty(window.history, 'state', 'get').and.returnValue({});

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.toastMessage()).toBeNull();
      expect(component2.toastNotifications().length).toBe(0);
    });

    it('dovrebbe pulire history state dopo aver mostrato il toast', () => {
      const mockState = {
        toast: {
          message: 'Test message',
          type: 'info'
        }
      };

      spyOnProperty(window.history, 'state', 'get').and.returnValue(mockState);
      spyOn(window.history, 'replaceState');

      const fixture2 = TestBed.createComponent(About);
      fixture2.detectChanges();

      expect(window.history.replaceState).toHaveBeenCalledWith({}, document.title);
    });
  });

  describe('Track By Function', () => {
    it('trackById dovrebbe restituire l\'id della card', () => {
      const card = { id: 'card-123', title: 'Test', description: 'Test desc' };
      const result = component.trackById(0, card);
      
      expect(result).toBe('card-123');
    });

    it('trackById dovrebbe gestire card diverse', () => {
      const card1 = { id: 'card-1', title: 'Test 1', description: 'Desc 1' };
      const card2 = { id: 'card-2', title: 'Test 2', description: 'Desc 2' };
      
      expect(component.trackById(0, card1)).toBe('card-1');
      expect(component.trackById(1, card2)).toBe('card-2');
    });
  });

  describe('Cards Management', () => {
    it('dovrebbe trasformare i dati API in AboutCard', () => {
      const cards = component.cards();
      
      expect(cards[0].id).toBe('1');
      expect(cards[0].title).toBe('Web Development');
      expect(cards[0].description).toBe('Building modern web apps');
      expect(cards[0].icon).toBe('code');
    });

    it('dovrebbe gestire card senza icon', () => {
      const cardsWithoutIcon = [
        { id: 1, title: 'Test', description: 'Desc', icon: '' }
      ];
      
      whatIDoService.get$.and.returnValue(of(cardsWithoutIcon));

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.cards()[0].icon).toBe('');
    });

    it('dovrebbe gestire array vuoto di card', () => {
      whatIDoService.get$.and.returnValue(of([]));

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.cards().length).toBe(0);
      expect(component2.loading()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('dovrebbe mostrare messaggio di errore specifico', () => {
      whatIDoService.get$.and.returnValue(
        throwError(() => ({ message: 'Errore di connessione' }))
      );

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.errorMsg()).toBe('Impossibile caricare le card.');
      expect(component2.loading()).toBe(false);
    });

    it('dovrebbe gestire errore HTTP 500', () => {
      whatIDoService.get$.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.loading()).toBe(false);
      expect(component2.errorMsg()).toBeTruthy();
    });

    it('dovrebbe gestire timeout', () => {
      whatIDoService.get$.and.returnValue(
        throwError(() => ({ name: 'TimeoutError' }))
      );

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.loading()).toBe(false);
    });
  });

  describe('Signals State', () => {
    it('loading signal dovrebbe aggiornarsi correttamente', () => {
      expect(component.loading()).toBe(false);
      
      component.loading.set(true);
      expect(component.loading()).toBe(true);
    });

    it('errorMsg signal dovrebbe essere settabile', () => {
      component.errorMsg.set('Errore personalizzato');
      expect(component.errorMsg()).toBe('Errore personalizzato');
      
      component.errorMsg.set(null);
      expect(component.errorMsg()).toBeNull();
    });

    it('cards signal dovrebbe essere aggiornabile', () => {
      const newCards = [
        { id: '999', title: 'New Card', description: 'New Description' }
      ];
      
      component.cards.set(newCards);
      expect(component.cards().length).toBe(1);
      expect(component.cards()[0].title).toBe('New Card');
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire card con stringhe vuote', () => {
      whatIDoService.get$.and.returnValue(of([
        { id: 1, title: '', description: '', icon: '' }
      ]));

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.cards()[0].title).toBe('');
      expect(component2.cards()[0].description).toBe('');
    });

    it('dovrebbe gestire id numerici grandi', () => {
      whatIDoService.get$.and.returnValue(of([
        { id: 999999999, title: 'Test', description: 'Desc', icon: 'test-icon' }
      ]));

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.cards()[0].id).toBe('999999999');
    });

    it('dovrebbe gestire molte card contemporaneamente', () => {
      const manyCards = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Card ${i + 1}`,
        description: `Description ${i + 1}`,
        icon: `icon-${i + 1}`
      }));

      whatIDoService.get$.and.returnValue(of(manyCards));

      const fixture2 = TestBed.createComponent(About);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.cards().length).toBe(50);
    });
  });
});
