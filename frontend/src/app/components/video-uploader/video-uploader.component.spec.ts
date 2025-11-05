import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoUploaderComponent } from './video-uploader.component';
import { ComponentRef } from '@angular/core';

describe('VideoUploaderComponent', () => {
  let component: VideoUploaderComponent;
  let fixture: ComponentFixture<VideoUploaderComponent>;
  let componentRef: ComponentRef<VideoUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoUploaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VideoUploaderComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('videoUrl dovrebbe essere null di default', () => {
    expect(component.videoUrl()).toBeNull();
  });

  it('isEditMode dovrebbe essere false', () => {
    expect(component.isEditMode()).toBe(false);
  });

  it('saving dovrebbe essere false', () => {
    expect(component.saving()).toBe(false);
  });

  it('dovrebbe accettare videoUrl via input', () => {
    componentRef.setInput('videoUrl', 'https://example.com/video.mp4');
    fixture.detectChanges();
    expect(component.videoUrl()).toBe('https://example.com/video.mp4');
  });

  it('dovrebbe accettare isEditMode via input', () => {
    componentRef.setInput('isEditMode', true);
    fixture.detectChanges();
    expect(component.isEditMode()).toBe(true);
  });
});

