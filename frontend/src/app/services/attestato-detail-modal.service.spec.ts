import { TestBed } from '@angular/core/testing';
import { AttestatoDetailModalService } from './attestato-detail-modal.service';

describe('AttestatoDetailModalService', () => {
  let service: AttestatoDetailModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttestatoDetailModalService);
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe inizializzare con isOpen = false', () => {
    expect(service.isOpen()).toBe(false);
  });

  it('dovrebbe aprire modal', () => {
    const mockAttestato: any = { id: 1, title: 'Test', institution: 'Inst' };
    service.open(mockAttestato);
    expect(service.isOpen()).toBe(true);
  });

  it('dovrebbe chiudere modal', () => {
    const mockAttestato: any = { id: 2, title: 'Test', institution: 'Inst' };
    service.open(mockAttestato);
    service.close();
    expect(service.isOpen()).toBe(false);
  });
});

