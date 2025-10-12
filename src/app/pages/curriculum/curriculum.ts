import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ResumeSection } from '../../components/resume-section/resume-section';

type TimelineItem = { title: string; years: string; description: string };

@Component({
  selector: 'app-curriculum',
  imports: [
    ResumeSection
  ],
  templateUrl: './curriculum.html',
  styleUrl: './curriculum.css'
})
export class Curriculum {
  private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map(d => d['title'] as string)), { initialValue: '' });

  education = signal<TimelineItem[]>([
    {
      title: 'University Of Engineering Pune',
      years: '2021 — 2024',
      description:
        'Nemo enim ipsam voluptatem, blanditiis praesentium voluptatum delenit atque corrupti, quos dolores et quas molestias exceptur.'
    },
    {
      title: 'New York Academy Of Texas',
      years: '2018 — 2024',
      description:
        'Ratione voluptatem sequi nesciunt, facere quisquams facere menda ossimus, omnis voluptas assumenda est omnis.'
    },
    {
      title: 'High School Of Art And Design',
      years: '2017 — 2018',
      description:
        'Duis aute irure dolor in reprehenderit in voluptate, quila voluptas mag odit aut fugit.'
    }
  ]);

  experience = signal<TimelineItem[]>([
    {
      title: 'Senior Full-Stack Developer - Acme Corp',
      years: '2024 — Presente',
      description: 'Sviluppo SPA e backend scalabili, CI/CD, performance.'
    },
    {
      title: 'Software Engineer - Beta Studio',
      years: '2021 — 2024',
      description: 'Electron/.NET desktop, automazioni e integrazioni.'
    }
  ]);
}
