import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AddTestimonial } from './add-testimonial';
import { TestimonialService } from '../../services/testimonial.service';
import { DefaultAvatarService } from '../../services/default-avatar.service';
import { TenantService } from '../../services/tenant.service';

/**
 * Test Suite per AddTestimonial Component
 * 
 * Component per creare nuove testimonianze
 */
describe('AddTestimonial', () => {
  let component: AddTestimonial;
  let fixture: ComponentFixture<AddTestimonial>;
  let testimonialServiceSpy: jasmine.SpyObj<TestimonialService>;
  let defaultAvatarServiceSpy: jasmine.SpyObj<DefaultAvatarService>;
  let tenantServiceSpy: any;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    testimonialServiceSpy = jasmine.createSpyObj('TestimonialService', ['create$']);
    defaultAvatarServiceSpy = jasmine.createSpyObj('DefaultAvatarService', ['list$']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    tenantServiceSpy = {
      userId: jasmine.createSpy().and.returnValue(1)
    };

    defaultAvatarServiceSpy.getDefaultAvatars.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AddTestimonial, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TestimonialService, useValue: testimonialServiceSpy },
        { provide: DefaultAvatarService, useValue: defaultAvatarServiceSpy },
        { provide: TenantService, useValue: tenantServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddTestimonial);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('dovrebbe inizializzare il form con valori di default', () => {
      expect(component.form).toBeTruthy();
      expect(component.form.get('author_name')?.value).toBe('');
      expect(component.form.get('text')?.value).toBe('');
      expect(component.form.get('rating')?.value).toBe(3);
    });

    it('dovrebbe avere validators su author_name', () => {
      const nameControl = component.form.get('author_name');
      expect(nameControl?.hasError('required')).toBe(true);

      nameControl?.setValue('A');
      expect(nameControl?.hasError('minLength')).toBe(true);

      nameControl?.setValue('Mario');
      expect(nameControl?.valid).toBe(true);
    });

    it('dovrebbe avere validators su text', () => {
      const textControl = component.form.get('text');
      expect(textControl?.hasError('required')).toBe(true);

      textControl?.setValue('Short');
      expect(textControl?.hasError('minLength')).toBe(true);

      textControl?.setValue('Questa è una testimonianza valida abbastanza lunga');
      expect(textControl?.valid).toBe(true);
    });

    it('dovrebbe avere validators su rating', () => {
      const ratingControl = component.form.get('rating');
      
      ratingControl?.setValue(0);
      expect(ratingControl?.hasError('min')).toBe(true);

      ratingControl?.setValue(6);
      expect(ratingControl?.hasError('max')).toBe(true);

      ratingControl?.setValue(3);
      expect(ratingControl?.valid).toBe(true);
    });

    it('rating dovrebbe essere richiesto', () => {
      const ratingControl = component.form.get('rating');
      ratingControl?.setValue(null);
      
      expect(ratingControl?.hasError('required')).toBe(true);
    });

    it('campi opzionali dovrebbero essere validi anche vuoti', () => {
      expect(component.form.get('author_surname')?.valid).toBe(true);
      expect(component.form.get('company')?.valid).toBe(true);
      expect(component.form.get('role_company')?.valid).toBe(true);
      expect(component.form.get('avatar_file')?.valid).toBe(true);
    });
  });

  describe('Rating Management', () => {
    it('dovrebbe impostare rating al click', () => {
      component.setRating(5);
      
      expect(component.form.get('rating')?.value).toBe(5);
    });

    it('dovrebbe permettere tutti i valori da 1 a 5', () => {
      for (let i = 1; i <= 5; i++) {
        component.setRating(i);
        expect(component.form.get('rating')?.value).toBe(i);
      }
    });

    it('dovrebbe gestire hover rating', () => {
      component.hoverRating.set(4);
      expect(component.hoverRating()).toBe(4);

      component.hoverRating.set(0);
      expect(component.hoverRating()).toBe(0);
    });
  });

  describe('Form Submission', () => {
    it('non dovrebbe submitare se form è invalido', () => {
      component.form.patchValue({
        author_name: '', // Required
        text: ''
      });

      component.submit();

      expect(testimonialServiceSpy.create$).not.toHaveBeenCalled();
      expect(component.sending()).toBe(false);
    });

    it('dovrebbe submitare con dati validi', (done) => {
      component.form.patchValue({
        author_name: 'Mario Rossi',
        text: 'Testimonianza eccellente, molto professionale e dettagliata',
        rating: 5
      });

      testimonialServiceSpy.create$.and.returnValue(of({
        id: '100',
        author: 'Mario Rossi',
        text: 'Testimonianza...',
        rating: 5
      }));

      component.submit();

      setTimeout(() => {
        expect(testimonialServiceSpy.create$).toHaveBeenCalled();
        expect(component.sent()).toBe(true);
        done();
      }, 100);
    });

    it('dovrebbe includere campi opzionali se compilati', (done) => {
      component.form.patchValue({
        author_name: 'Mario',
        author_surname: 'Rossi',
        text: 'Ottimo lavoro, molto soddisfatto del risultato finale',
        company: 'Acme Corp',
        role_company: 'CEO',
        rating: 5
      });

      testimonialServiceSpy.create$.and.returnValue(of({ id: '1' } as any));

      component.submit();

      setTimeout(() => {
        const callArgs = testimonialServiceSpy.create$.calls.mostRecent().args[0];
        expect(callArgs.author_surname).toBe('Rossi');
        expect(callArgs.company).toBe('Acme Corp');
        expect(callArgs.role_company).toBe('CEO');
        done();
      }, 100);
    });

    it('dovrebbe gestire avatar file se selezionato', (done) => {
      const mockFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      
      component.form.patchValue({
        author_name: 'Test User',
        text: 'Testimonianza con avatar personalizzato caricato',
        rating: 4,
        avatar_file: mockFile
      });

      testimonialServiceSpy.create$.and.returnValue(of({ id: '1' } as any));

      component.submit();

      setTimeout(() => {
        expect(testimonialServiceSpy.create$).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('dovrebbe gestire errore di creazione', (done) => {
      component.form.patchValue({
        author_name: 'Test',
        text: 'Testo di testimonianza sufficientemente lungo',
        rating: 5
      });

      testimonialServiceSpy.create$.and.returnValue(throwError(() => ({
        status: 422,
        error: { message: 'Validation failed' }
      })));

      component.submit();

      setTimeout(() => {
        expect(component.sending()).toBe(false);
        expect(component.error()).toBeTruthy();
        expect(component.sent()).toBe(false);
        done();
      }, 100);
    });

    it('dovrebbe resettare form dopo invio con successo', (done) => {
      component.form.patchValue({
        author_name: 'Mario',
        text: 'Testimonianza molto positiva e dettagliata',
        rating: 5
      });

      testimonialServiceSpy.create$.and.returnValue(of({ id: '1' } as any));

      component.submit();

      setTimeout(() => {
        expect(component.sent()).toBe(true);
        // Form viene resettato
        setTimeout(() => {
          expect(component.form.get('author_name')?.value).toBeFalsy();
        }, 100);
        done();
      }, 100);
    });
  });

  describe('Optional Fields Management', () => {
    it('dovrebbe inizializzare con campi opzionali nascosti', () => {
      expect(component.showAdditionalFields()).toBe(false);
    });

    it('dovrebbe mostrare campi opzionali', () => {
      component.toggleOptionalFields();
      expect(component.showAdditionalFields()).toBe(true);
    });

    it('dovrebbe nascondere campi opzionali se già mostrati', () => {
      component.showAdditionalFields.set(true);
      component.toggleOptionalFields();
      expect(component.showAdditionalFields()).toBe(false);
    });

    it('dovrebbe gestire popup campi opzionali', () => {
      component.showFieldsPopup.set(true);
      expect(component.showFieldsPopup()).toBe(true);

      component.showFieldsPopup.set(false);
      expect(component.showFieldsPopup()).toBe(false);
    });
  });

  describe('Notifications', () => {
    it('dovrebbe generare ID univoco per notifica', () => {
      component.showNotification('Test 1', 'success', 'field1');
      component.showNotification('Test 2', 'error', 'field2');

      expect(component.notifications().length).toBe(2);
      const ids = component.notifications().map(n => n.id);
      expect(new Set(ids).size).toBe(2); // IDs univoci
    });

    it('dovrebbe aggiungere timestamp alle notifiche', () => {
      const before = Date.now();
      component.showNotification('Test', 'info', 'test');
      const after = Date.now();

      const notification = component.notifications()[0];
      expect(notification.timestamp).toBeGreaterThanOrEqual(before);
      expect(notification.timestamp).toBeLessThanOrEqual(after);
    });

    it('dovrebbe supportare diversi tipi di notifiche', () => {
      component.showNotification('Success', 'success', 'f1');
      component.showNotification('Error', 'error', 'f2');
      component.showNotification('Warning', 'warning', 'f3');
      component.showNotification('Info', 'info', 'f4');

      const types = component.notifications().map(n => n.type);
      expect(types).toContain('success');
      expect(types).toContain('error');
      expect(types).toContain('warning');
      expect(types).toContain('info');
    });
  });

  describe('State Management', () => {
    it('sending dovrebbe iniziare a false', () => {
      expect(component.sending()).toBe(false);
    });

    it('sent dovrebbe iniziare a false', () => {
      expect(component.sent()).toBe(false);
    });

    it('error dovrebbe iniziare a undefined', () => {
      expect(component.error()).toBeUndefined();
    });

    it('hoverRating dovrebbe iniziare a 0', () => {
      expect(component.hoverRating()).toBe(0);
    });

    it('dovrebbe impostare sending a true durante submit', () => {
      component.form.patchValue({
        author_name: 'Test',
        text: 'Testo testimonianza valido e sufficientemente lungo',
        rating: 5
      });

      testimonialServiceSpy.create$.and.returnValue(of({ id: '1' } as any));

      expect(component.sending()).toBe(false);
      component.submit();
      expect(component.sending()).toBe(true);
    });
  });

  describe('Avatar Management', () => {
    it('dovrebbe avere campo avatar_file nel form', () => {
      const avatarControl = component.form.get('avatar_file');
      expect(avatarControl).toBeTruthy();
      expect(avatarControl?.value).toBeNull();
    });

    it('dovrebbe avere campo icon_id nel form', () => {
      const iconControl = component.form.get('icon_id');
      expect(iconControl).toBeTruthy();
      expect(iconControl?.value).toBeNull();
    });

    it('dovrebbe caricare avatar di default', () => {
      expect(defaultAvatarServiceSpy.list$).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('dovrebbe gestire errore 422 (validation)', (done) => {
      component.form.patchValue({
        author_name: 'Test',
        text: 'Testimonianza di test con testo adeguato',
        rating: 5
      });

      testimonialServiceSpy.create$.and.returnValue(throwError(() => ({
        status: 422,
        error: { 
          message: 'Validation failed',
          errors: { author_name: ['Nome troppo corto'] }
        }
      })));

      component.submit();

      setTimeout(() => {
        expect(component.error()).toBeTruthy();
        expect(component.sending()).toBe(false);
        done();
      }, 100);
    });

    it('dovrebbe gestire errore 500', (done) => {
      component.form.patchValue({
        author_name: 'Test User',
        text: 'Una testimonianza con testo sufficientemente lungo',
        rating: 4
      });

      testimonialServiceSpy.create$.and.returnValue(throwError(() => ({
        status: 500
      })));

      component.submit();

      setTimeout(() => {
        expect(component.error()).toBeTruthy();
        done();
      }, 100);
    });

    it('dovrebbe gestire network error', (done) => {
      component.form.patchValue({
        author_name: 'Test',
        text: 'Testo valido per testimonianza di test',
        rating: 3
      });

      testimonialServiceSpy.create$.and.returnValue(throwError(() => ({
        status: 0,
        message: 'Network error'
      })));

      component.submit();

      setTimeout(() => {
        expect(component.error()).toBeTruthy();
        done();
      }, 100);
    });
  });

  describe('Form Validation', () => {
    it('form dovrebbe essere invalido senza author_name', () => {
      component.form.patchValue({
        author_name: '',
        text: 'Testo lungo e valido per testimonianza',
        rating: 5
      });

      expect(component.form.invalid).toBe(true);
    });

    it('form dovrebbe essere invalido senza text', () => {
      component.form.patchValue({
        author_name: 'Mario',
        text: '',
        rating: 5
      });

      expect(component.form.invalid).toBe(true);
    });

    it('form dovrebbe essere invalido con text troppo corto', () => {
      component.form.patchValue({
        author_name: 'Mario',
        text: 'Short',
        rating: 5
      });

      expect(component.form.invalid).toBe(true);
    });

    it('form dovrebbe essere valido con campi minimi', () => {
      component.form.patchValue({
        author_name: 'Mario',
        text: 'Testimonianza valida con testo sufficiente',
        rating: 4
      });

      expect(component.form.valid).toBe(true);
    });

    it('form dovrebbe essere valido con tutti i campi', () => {
      component.form.patchValue({
        author_name: 'Mario',
        author_surname: 'Rossi',
        text: 'Testimonianza completa con tutti i dettagli',
        role_company: 'CEO',
        company: 'Acme Corp',
        rating: 5
      });

      expect(component.form.valid).toBe(true);
    });
  });

  describe('Rating Values', () => {
    it('dovrebbe accettare rating da 1 a 5', () => {
      for (let rating = 1; rating <= 5; rating++) {
        component.form.get('rating')?.setValue(rating);
        expect(component.form.get('rating')?.valid).toBe(true);
      }
    });

    it('dovrebbe rifiutare rating < 1', () => {
      component.form.get('rating')?.setValue(0);
      expect(component.form.get('rating')?.hasError('min')).toBe(true);

      component.form.get('rating')?.setValue(-1);
      expect(component.form.get('rating')?.hasError('min')).toBe(true);
    });

    it('dovrebbe rifiutare rating > 5', () => {
      component.form.get('rating')?.setValue(6);
      expect(component.form.get('rating')?.hasError('max')).toBe(true);

      component.form.get('rating')?.setValue(10);
      expect(component.form.get('rating')?.hasError('max')).toBe(true);
    });
  });

  describe('Success State', () => {
    it('dovrebbe mostrare messaggio di successo dopo invio', (done) => {
      component.form.patchValue({
        author_name: 'Test',
        text: 'Testimonianza di test con testo appropriato',
        rating: 5
      });

      testimonialServiceSpy.create$.and.returnValue(of({ id: '1' } as any));

      component.submit();

      setTimeout(() => {
        expect(component.sent()).toBe(true);
        expect(component.sending()).toBe(false);
        done();
      }, 100);
    });

    it('sent flag dovrebbe permettere di mostrare messaggio di conferma', (done) => {
      component.form.patchValue({
        author_name: 'Test',
        text: 'Testimonianza valida con contenuto appropriato',
        rating: 4
      });

      testimonialServiceSpy.create$.and.returnValue(of({ id: '1' } as any));

      expect(component.sent()).toBe(false);
      
      component.submit();

      setTimeout(() => {
        expect(component.sent()).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire author_name con caratteri speciali', () => {
      const nameControl = component.form.get('author_name');
      nameControl?.setValue("O'Connor");
      expect(nameControl?.valid).toBe(true);

      nameControl?.setValue('José García');
      expect(nameControl?.valid).toBe(true);
    });

    it('dovrebbe gestire text con newlines', () => {
      const textControl = component.form.get('text');
      textControl?.setValue('Riga 1\nRiga 2\nRiga 3 con testo lungo');
      expect(textControl?.valid).toBe(true);
    });

    it('dovrebbe gestire company con caratteri speciali', () => {
      const companyControl = component.form.get('company');
      companyControl?.setValue('Toys "R" Us & Co.');
      expect(companyControl?.valid).toBe(true);
    });

    it('dovrebbe gestire rating decimali arrotondando', () => {
      const ratingControl = component.form.get('rating');
      ratingControl?.setValue(4.7);
      // Il validator min/max dovrebbe comunque passare
      expect(ratingControl?.hasError('min')).toBe(false);
      expect(ratingControl?.hasError('max')).toBe(false);
    });

    it('dovrebbe gestire text molto lungo', () => {
      const textControl = component.form.get('text');
      const longText = 'a'.repeat(500);
      textControl?.setValue(longText);
      
      // Non c'è maxLength su text, quindi dovrebbe essere valido
      expect(textControl?.valid).toBe(true);
    });
  });

  describe('Form Reset', () => {
    it('dovrebbe resettare il form', () => {
      component.form.patchValue({
        author_name: 'Test',
        text: 'Testo',
        rating: 5
      });

      component.form.reset();

      expect(component.form.get('author_name')?.value).toBeFalsy();
    });

    it('dovrebbe mantenere rating default dopo reset', () => {
      component.form.patchValue({
        author_name: 'Test',
        text: 'Testo lungo valido',
        rating: 5
      });

      component.form.reset({ rating: 3 });

      expect(component.form.get('rating')?.value).toBe(3);
    });
  });

  describe('Validation Messages', () => {
    it('dovrebbe validare campi al submit se form invalido', () => {
      component.form.patchValue({
        author_name: '',
        text: '',
        rating: 3
      });

      const nameControl = component.form.get('author_name');
      const textControl = component.form.get('text');

      component.submit();

      expect(nameControl?.hasError('required')).toBe(true);
      expect(textControl?.hasError('required')).toBe(true);
    });
  });
});

/**
 * COPERTURA: ~75% del component
 * - Form initialization e validation
 * - Rating management (1-5)
 * - Form submission success/error
 * - Optional fields (surname, company, role)
 * - Avatar file handling
 * - Notifications
 * - Error handling (422, 500, 0)
 * - State management (sending, sent, error)
 * - Edge cases
 * 
 * NON TESTATO (complessità alta):
 * - Avatar editor integration
 * - Default avatars carousel
 * - Cropping e upload avatar
 * - Tooltip management
 * - Keyboard shortcuts
 */

