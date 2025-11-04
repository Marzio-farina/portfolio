import { TestBed } from '@angular/core/testing';
import { CvUploadModalService } from './cv-upload-modal.service';

describe('CvUploadModalService', () => {
  let service: CvUploadModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CvUploadModalService);
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe gestire stato modal', () => {
    expect(service.isOpen()).toBe(false);
    service.open();
    expect(service.isOpen()).toBe(true);
    service.close();
    expect(service.isOpen()).toBe(false);
  });
});

