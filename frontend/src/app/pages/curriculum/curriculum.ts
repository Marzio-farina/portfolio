import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ResumeSection } from '../../components/resume-section/resume-section';
import { HttpClient } from '@angular/common/http';
import { Skills } from '../../components/skills/skills';

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
  private http = inject(HttpClient);

  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  education = signal<TimelineItem[]>([]);
  experience = signal<TimelineItem[]>([]);

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.http.get<{ education: TimelineItem[]; experience: TimelineItem[] }>('assets/json/curriculum.json')
      .subscribe(data => {
        this.education.set(data.education);
        this.experience.set(data.experience);
      });
  }
}
