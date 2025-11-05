import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CvPreviewModal } from './cv-preview-modal';
import { CvPreviewModalService } from '../../services/cv-preview-modal.service';
import { DomSanitizer } from '@angular/platform-browser';
import { signal } from '@angular/core';

describe('CvPreviewModal', () => {
  let component: CvPreviewModal;
  let fixture: ComponentFixture<CvPreviewModal>;
  let modalServiceSpy: any;
  let sanitizerSpy: jasmine.SpyObj<DomSanitizer>;

  beforeEach(async () => {
    modalServiceSpy = {
      url: signal('https://example.com/cv.pdf'),
      close: jasmine.createSpy('close')
    };

    sanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustResourceUrl']);
    sanitizerSpy.bypassSecurityTrustResourceUrl.and.returnValue('safe:url' as any);

    await TestBed.configureTestingModule({
      imports: [CvPreviewModal],
      providers: [
        { provide: CvPreviewModalService, useValue: modalServiceSpy },
        { provide: DomSanitizer, useValue: sanitizerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CvPreviewModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('safeUrl dovrebbe sanitizzare URL', () => {
    expect(sanitizerSpy.bypassSecurityTrustResourceUrl).toHaveBeenCalled();
  });

  it('close dovrebbe chiamare modal service', () => {
    component.close();
    expect(modalServiceSpy.close).toHaveBeenCalled();
  });

  it('safeUrl dovrebbe essere null se url è null', () => {
    modalServiceSpy.url = signal(null);
    const newFixture = TestBed.createComponent(CvPreviewModal);
    newFixture.detectChanges();
    expect(newFixture.componentInstance.safeUrl()).toBeNull();
  });
});

