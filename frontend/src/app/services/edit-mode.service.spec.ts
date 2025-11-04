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
});

