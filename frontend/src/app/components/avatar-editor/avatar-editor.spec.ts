import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AvatarEditor } from './avatar-editor';
import { DefaultAvatarService } from '../../services/default-avatar.service';
import { of } from 'rxjs';
import { ComponentRef } from '@angular/core';

describe('AvatarEditor', () => {
  let component: AvatarEditor;
  let fixture: ComponentFixture<AvatarEditor>;
  let componentRef: ComponentRef<AvatarEditor>;
  let defaultAvatarServiceSpy: jasmine.SpyObj<DefaultAvatarService>;

  beforeEach(async () => {
    defaultAvatarServiceSpy = jasmine.createSpyObj('DefaultAvatarService', [], {
      list$: of([])
    });

    await TestBed.configureTestingModule({
      imports: [AvatarEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DefaultAvatarService, useValue: defaultAvatarServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarEditor);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('initialUrl dovrebbe essere null di default', () => {
    expect(component.initialUrl()).toBeNull();
  });

  it('width dovrebbe essere auto di default', () => {
    expect(component.width()).toBe('auto');
  });

  it('height dovrebbe essere auto di default', () => {
    expect(component.height()).toBe('auto');
  });

  it('size dovrebbe essere 80 di default', () => {
    expect(component.size()).toBe(80);
  });

  it('context dovrebbe essere generic di default', () => {
    expect(component.context()).toBe('generic');
  });

  it('editing dovrebbe essere false di default', () => {
    expect(component.editing()).toBe(false);
  });

  it('dovrebbe avere default avatars service', () => {
    expect(component).toBeTruthy();
  });

  it('uploadedUrl dovrebbe iniziare null', () => {
    expect(component.uploadedUrl()).toBeNull();
  });

  it('imageLoaded dovrebbe iniziare false', () => {
    expect(component.imageLoaded()).toBe(false);
  });

  it('hostDisplay dovrebbe essere empty per aside context', () => {
    componentRef.setInput('context', 'aside');
    fixture.detectChanges();
    expect(component.hostDisplay).toBe('');
  });

  it('hostDisplay dovrebbe essere inline-block per altri context', () => {
    componentRef.setInput('context', 'testimonial');
    fixture.detectChanges();
    expect(component.hostDisplay).toBe('inline-block');
  });

  it('hostW dovrebbe calcolare width', () => {
    componentRef.setInput('width', 100);
    fixture.detectChanges();
    expect(component.hostW).toBe('100px');
  });

  it('hostW dovrebbe essere auto se width è auto', () => {
    componentRef.setInput('width', 'auto');
    fixture.detectChanges();
    expect(component.hostW).toBe('auto');
  });

  it('hostH dovrebbe calcolare height', () => {
    componentRef.setInput('height', 150);
    fixture.detectChanges();
    expect(component.hostH).toBe('150px');
  });
});

