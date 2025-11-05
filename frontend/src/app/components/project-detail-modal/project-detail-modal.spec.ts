import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProjectDetailModal } from './project-detail-modal';
import { ProjectDetailModalService } from '../../services/project-detail-modal.service';
import { ProjectService } from '../../services/project.service';
import { TechnologyService } from '../../services/technology.service';
import { CategoryService } from '../../services/category.service';
import { EditModeService } from '../../services/edit-mode.service';
import { AuthService } from '../../services/auth.service';
import { CanvasService } from '../../services/canvas.service';
import { signal } from '@angular/core';
import { ComponentRef } from '@angular/core';
import { of } from 'rxjs';

describe('ProjectDetailModal', () => {
  let component: ProjectDetailModal;
  let fixture: ComponentFixture<ProjectDetailModal>;
  let componentRef: ComponentRef<ProjectDetailModal>;

  const mockProject = {
    id: 1,
    title: 'Test Project',
    description: 'Test Description',
    category: { id: 1, title: 'Web' },
    technologies: []
  };

  beforeEach(async () => {
    const modalServiceSpy: any = { close: jasmine.createSpy('close') };
    const projectServiceSpy = jasmine.createSpyObj('ProjectService', ['updateWithFiles$']);
    const technologyServiceSpy = jasmine.createSpyObj('TechnologyService', ['list$']);
    const categoryServiceSpy = jasmine.createSpyObj('CategoryService', ['list$']);
    const editModeSpy: any = { isEditing: signal(false) };
    const authServiceSpy: any = { isAuthenticated: signal(false) };
    const canvasServiceSpy = jasmine.createSpyObj('CanvasService', ['selectDevice', 'reset']);

    technologyServiceSpy.list$.and.returnValue(of([]));
    categoryServiceSpy.list$.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ProjectDetailModal, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProjectDetailModalService, useValue: modalServiceSpy },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: TechnologyService, useValue: technologyServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: EditModeService, useValue: editModeSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CanvasService, useValue: canvasServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailModal);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('project', mockProject);
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('project input dovrebbe essere impostato', () => {
    expect(component.project().id).toBe(1);
  });

  it('closed output dovrebbe essere definito', () => {
    expect(component.closed).toBeTruthy();
  });

  it('isAuthenticated dovrebbe riflettere AuthService', () => {
    expect(component.isAuthenticated()).toBe(false);
  });

  it('isEditing dovrebbe riflettere EditModeService', () => {
    expect(component.isEditing()).toBe(false);
  });

  it('saving dovrebbe iniziare false', () => {
    expect(component.saving()).toBe(false);
  });

  it('aspectRatio dovrebbe iniziare null', () => {
    expect(component.aspectRatio()).toBeNull();
  });
});

