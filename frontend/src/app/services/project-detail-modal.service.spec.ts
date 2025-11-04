import { TestBed } from '@angular/core/testing';
import { ProjectDetailModalService } from './project-detail-modal.service';

describe('ProjectDetailModalService', () => {
  let service: ProjectDetailModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectDetailModalService);
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe inizializzare con isOpen = false', () => {
    expect(service.isOpen()).toBe(false);
  });

  it('dovrebbe aprire modal', () => {
    const mockProject: any = { id: 10, title: 'Test', description: 'Desc' };
    service.open(mockProject);
    expect(service.isOpen()).toBe(true);
  });

  it('dovrebbe chiudere modal', () => {
    const mockProject: any = { id: 5, title: 'Test', description: 'Desc' };
    service.open(mockProject);
    service.close();
    expect(service.isOpen()).toBe(false);
  });

});

