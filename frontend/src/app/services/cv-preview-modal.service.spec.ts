import { TestBed } from '@angular/core/testing';
import { CvPreviewModalService } from './cv-preview-modal.service';

describe('CvPreviewModalService', () => {
  let service: CvPreviewModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CvPreviewModalService);
  });

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe gestire stato modal', () => {
    expect(service.isOpen()).toBe(false);
    service.open('https://test.com/cv.pdf');
    expect(service.isOpen()).toBe(true);
    service.close();
    expect(service.isOpen()).toBe(false);
  });
});

