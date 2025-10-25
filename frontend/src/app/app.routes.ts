// app.routes.ts
import { Routes } from '@angular/router';
import { About } from './pages/about/about';
import { Contatti } from './pages/contatti/contatti';
import { Curriculum } from './pages/curriculum/curriculum';
import { Progetti } from './pages/progetti/progetti';
import { Attestati } from './pages/attestati/attestati';
import { Accedi } from './pages/accedi/accedi';
import { AddTestimonial } from './components/add-testimonial/add-testimonial';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'about' },
  { path: 'about',     component: About,     data: { title: 'Chi sono' } },
  { path: 'nuova-recensione', component: AddTestimonial, data: { title: 'Nuova Recensione' } },
  { path: 'curriculum',component: Curriculum,data: { title: 'Curriculum' } },
  { path: 'progetti',  component: Progetti,  data: { title: 'Progetti' } },
  { path: 'attestati',  component: Attestati,  data: { title: 'Attestati' } },
  { path: 'contatti',  component: Contatti,  data: { title: 'Contatti' } },
  { path: 'accedi',  component: Accedi,  data: { title: 'Accedi' } },
  { path: '**', redirectTo: 'about' },
];