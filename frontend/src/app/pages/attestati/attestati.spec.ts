import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Attestati } from './attestati';

describe('Attestati', () => {
  let component: Attestati;
  let fixture: ComponentFixture<Attestati>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Attestati],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(Attestati);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Signals', () => {
    it('attestati signal dovrebbe essere definito', () => {
      expect(component.attestati).toBeDefined();
    });

    it('loading signal dovrebbe essere definito', () => {
      expect(component.loading).toBeDefined();
    });
  });

  describe('Attestati Data', () => {
    it('attestati dovrebbe gestire array vuoto', () => {
      component.attestati.set([]);
      expect(component.attestati().length).toBe(0);
    });

    it('attestati dovrebbe gestire array con elementi', () => {
      const mockAttestati: any[] = [
        { id: 1, title: 'Cert 1', issuer: 'Issuer 1', issued_at: '2023-01-01', poster: 'c1.jpg' },
        { id: 2, title: 'Cert 2', issuer: 'Issuer 2', issued_at: '2023-06-01', poster: 'c2.jpg' }
      ];
      
      component.attestati.set(mockAttestati);
      expect(component.attestati().length).toBe(2);
    });
  });

  describe('Loading State', () => {
    it('loading dovrebbe inizializzare', () => {
      expect(component.loading).toBeDefined();
    });

    it('loading dovrebbe essere modificabile', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);
      
      component.loading.set(false);
      expect(component.loading()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire attestato senza expires_at', () => {
      const attestato: any = {
        id: 1,
        title: 'No Expiry',
        issuer: 'Test',
        issued_at: '2023-01-01',
        poster: 'test.jpg'
      };
      
      component.attestati.set([attestato]);
      expect(component.attestati()[0].id).toBe(1);
    });

    it('dovrebbe gestire multiple attestati', () => {
      const mockData: any[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Cert ${i + 1}`,
        issuer: `Issuer ${i + 1}`,
        issued_at: '2023-01-01',
        poster: `c${i}.jpg`
      }));
      
      component.attestati.set(mockData);
      expect(component.attestati().length).toBe(10);
    });
  });
});
