// app.routes.ts
import { Routes } from '@angular/router';
import { About } from './pages/about/about';
import { Contatti } from './pages/contatti/contatti';
import { Curriculum } from './pages/curriculum/curriculum';
import { Progetti } from './pages/progetti/progetti';
import { Attestati } from './pages/attestati/attestati';
import { AddTestimonial } from './components/add-testimonial/add-testimonial';
import { AddAttestato } from './components/add-attestato/add-attestato';
import { tenantResolver } from './core/tenant/tenant.resolver';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'about' },
  { path: 'about',     component: About,     data: { title: 'Chi sono' } },
  { path: 'nuova-recensione', component: AddTestimonial, data: { title: 'Nuova Recensione' } },
  { path: 'curriculum',component: Curriculum,data: { title: 'Curriculum' } },
  { path: 'progetti',  component: Progetti,  data: { title: 'Progetti' } },
  { path: 'attestati',  component: Attestati,  data: { title: 'Attestati' } },
  { path: 'attestati/nuovo', component: AddAttestato, data: { title: 'Nuovo Attestato' } },
  { path: 'contatti',  component: Contatti,  data: { title: 'Contatti' } },
  // Rotte con prefisso slug utente
  { path: ':userSlug/about',     component: About,     resolve: { tenant: tenantResolver }, data: { title: 'Chi sono' } },
  { path: ':userSlug/curriculum',component: Curriculum,resolve: { tenant: tenantResolver }, data: { title: 'Curriculum' } },
  { path: ':userSlug/progetti',  component: Progetti,  resolve: { tenant: tenantResolver }, data: { title: 'Progetti' } },
  { path: ':userSlug/attestati', component: Attestati, resolve: { tenant: tenantResolver }, data: { title: 'Attestati' } },
  { path: ':userSlug/contatti',  component: Contatti,  resolve: { tenant: tenantResolver }, data: { title: 'Contatti' } },
  { path: '**', redirectTo: 'about' },
];