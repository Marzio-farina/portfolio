// app.routes.ts
import { Routes } from '@angular/router';
import { About } from './pages/about/about';
import { Contatti } from './pages/contatti/contatti';
import { Curriculum } from './pages/curriculum/curriculum';
import { Progetti } from './pages/progetti/progetti';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'about' },
  { path: 'about', component: About },
  { path: 'contatti', component: Contatti },
  { path: 'curriculum', component: Curriculum },
  { path: 'progetti', component: Progetti },
  { path: '**', redirectTo: 'about' },
];