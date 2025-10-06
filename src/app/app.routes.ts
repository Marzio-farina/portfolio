// app.routes.ts
import { Routes } from '@angular/router';
import { About } from './pages/about/about';
import { Contatti } from './pages/contatti/contatti';
import { Curriculum } from './pages/curriculum/curriculum';
import { Progetti } from './pages/progetti/progetti';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'about' },
  { path: 'about',     component: About,     data: { title: 'Chi sono' } },
  { path: 'contatti',  component: Contatti,  data: { title: 'Contatti' } },
  { path: 'curriculum',component: Curriculum,data: { title: 'Curriculum' } },
  { path: 'progetti',  component: Progetti,  data: { title: 'Progetti' } },
  { path: '**', redirectTo: 'about' },
];