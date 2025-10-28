import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ResumeSection } from '../../components/resume-section/resume-section';
import { Skills } from '../../components/skills/skills';
import { CvService } from '../../services/cv.service';

type TimelineItem = { title: string; years: string; description: string };

@Component({
  selector: 'app-curriculum',
  imports: [
    ResumeSection,
    Skills
  ],
  templateUrl: './curriculum.html',
  styleUrl: './curriculum.css'
})
export class Curriculum {
  private route = inject(ActivatedRoute);
  private cv = inject(CvService);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  education = signal<TimelineItem[]>([]);
  experience = signal<TimelineItem[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  cvMenuOpen = signal(false);

  constructor() {
    this.cv.get$().subscribe({
      next: data => {
        this.education.set(data.education);
        this.experience.set(data.experience);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Impossibile caricare il curriculum.');
        this.loading.set(false);
      }
    });
  }
}
