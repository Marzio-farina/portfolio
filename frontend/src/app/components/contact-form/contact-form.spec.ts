import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { ContactForm } from './contact-form';

describe('ContactForm', () => {
  let component: ContactForm;
  let fixture: ComponentFixture<ContactForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactForm],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('form dovrebbe essere definito', () => {
      expect(component.form).toBeDefined();
    });

    it('name dovrebbe essere required', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('');
      expect(nameControl?.hasError('required')).toBe(true);
    });

    it('email dovrebbe richiedere formato valido', () => {
      const emailControl = component.form.get('email');
      emailControl?.setValue('invalid');
      expect(emailControl?.hasError('email')).toBe(true);
    });

    it('message dovrebbe avere minLength 10', () => {
      const messageControl = component.form.get('message');
      messageControl?.setValue('short');
      expect(messageControl?.hasError('minlength')).toBe(true);
    });

    it('consent dovrebbe essere requiredTrue', () => {
      const consentControl = component.form.get('consent');
      consentControl?.setValue(false);
      expect(consentControl?.hasError('required')).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('form dovrebbe essere invalid se campi vuoti', () => {
      expect(component.form.valid).toBe(false);
    });

    it('form dovrebbe essere valid con tutti i campi compilati', () => {
      component.form.patchValue({
        name: 'Mario',
        surname: 'Rossi',
        email: 'mario@test.com',
        message: 'Messaggio di test lungo almeno 10 caratteri',
        consent: true
      });
      
      expect(component.form.valid).toBe(true);
    });

    it('dovrebbe validare email invalida', () => {
      component.form.patchValue({
        email: 'invalid-email'
      });
      
      expect(component.form.get('email')?.invalid).toBe(true);
    });

    it('dovrebbe validare email valida', () => {
      component.form.patchValue({
        email: 'test@example.com'
      });
      
      expect(component.form.get('email')?.valid).toBe(true);
    });
  });

  describe('getErrorType', () => {
    it('dovrebbe ritornare error per email', () => {
      expect(component.getErrorType('email')).toBe('error');
    });

    it('dovrebbe ritornare warning per consent', () => {
      expect(component.getErrorType('consent')).toBe('warning');
    });

    it('dovrebbe ritornare warning per name', () => {
      expect(component.getErrorType('name')).toBe('warning');
    });

    it('dovrebbe ritornare info per message', () => {
      expect(component.getErrorType('message')).toBe('info');
    });

    it('dovrebbe ritornare error per campo sconosciuto', () => {
      expect(component.getErrorType('unknown')).toBe('error');
    });
  });

  describe('getValidationErrors', () => {
    it('dovrebbe ritornare array vuoto se form valido', () => {
      component.form.patchValue({
        name: 'Mario',
        surname: 'Rossi',
        email: 'test@test.com',
        message: 'Messaggio lungo abbastanza',
        consent: true
      });
      
      const errors = component.getValidationErrors();
      expect(errors.length).toBe(0);
    });

    it('dovrebbe ritornare errori per campi invalidi', () => {
      component.form.patchValue({
        name: '',
        email: 'invalid'
      });
      
      component.form.markAllAsTouched();
      
      const errors = component.getValidationErrors();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('clearError', () => {
    it('dovrebbe pulire error', () => {
      component.error = 'Test error';
      component.clearError();
      expect(component.error).toBeUndefined();
    });

    it('dovrebbe emettere errorChange con undefined', (done) => {
      component.error = 'Test error';
      
      component.errorChange.subscribe((err) => {
        expect(err).toBeUndefined();
        done();
      });
      
      component.clearError();
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire name con 2 caratteri (minimo)', () => {
      component.form.patchValue({ name: 'AB' });
      expect(component.form.get('name')?.valid).toBe(true);
    });

    it('dovrebbe rifiutare name con 1 carattere', () => {
      component.form.patchValue({ name: 'A' });
      expect(component.form.get('name')?.hasError('minlength')).toBe(true);
    });

    it('dovrebbe gestire message esattamente 10 caratteri', () => {
      component.form.patchValue({ message: '1234567890' });
      expect(component.form.get('message')?.valid).toBe(true);
    });

    it('dovrebbe rifiutare message con 9 caratteri', () => {
      component.form.patchValue({ message: '123456789' });
      expect(component.form.get('message')?.hasError('minlength')).toBe(true);
    });
  });
});

/**
 * COPERTURA TEST CONTACT-FORM COMPONENT
 * ======================================
 * 
 * ✅ Component creation
 * ✅ Form initialization (validators per ogni campo)
 * ✅ Form validation (invalid/valid states)
 * ✅ Email validation (invalida/valida)
 * ✅ getErrorType (error/warning/info per campo)
 * ✅ getValidationErrors (array errori)
 * ✅ clearError (pulisce error e emette)
 * ✅ Edge cases (minLength boundaries)
 * 
 * COVERAGE STIMATA: ~75%
 * 
 * NON TESTATO (complessità HTTP/DOM):
 * - submit() con API call success/error
 * - Honeypot (website field)
 * - validateField() con real-time validation
 * - showFieldError() e removeFieldNotification()
 * - Tooltip logic
 * 
 * TOTALE: +22 nuovi test aggiunti
 */
