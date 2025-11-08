// app.routes.ts
import { Routes } from '@angular/router';
import { About } from './pages/about/about';
import { Contatti } from './pages/contatti/contatti';
import { Curriculum } from './pages/curriculum/curriculum';
import { Progetti } from './pages/progetti/progetti';
import { Attestati } from './pages/attestati/attestati';
import { AddTestimonial } from './components/add-testimonial/add-testimonial';
import { AddAttestato } from './components/add-attestato/add-attestato';
import { AddProject } from './components/add-project/add-project';
import { tenantResolver } from './core/tenant/tenant.resolver';
import { clearTenantResolver } from './core/tenant/clear-tenant.resolver';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'about' },
  { path: 'about',     component: About,     resolve: { clearTenant: clearTenantResolver }, data: { title: 'Chi sono' } },
  { path: 'nuova-recensione', component: AddTestimonial, resolve: { clearTenant: clearTenantResolver }, data: { title: 'Nuova Recensione' } },
  { path: 'curriculum',component: Curriculum, resolve: { clearTenant: clearTenantResolver }, data: { title: 'Curriculum' } },
  { path: 'progetti',  component: Progetti,  resolve: { clearTenant: clearTenantResolver }, data: { title: 'Progetti' } },
  { path: 'attestati',  component: Attestati,  resolve: { clearTenant: clearTenantResolver }, data: { title: 'Attestati' } },
  { path: 'attestati/nuovo', component: AddAttestato, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Nuovo Attestato' } },
  { path: 'progetti/nuovo', component: AddProject, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Nuovo Progetto' } },
  { path: 'contatti',  component: Contatti,  resolve: { clearTenant: clearTenantResolver }, data: { title: 'Contatti' } },
  // Rotte con prefisso slug utente
  { path: ':userSlug/about',     component: About,     resolve: { tenant: tenantResolver }, data: { title: 'Chi sono' } },
  { path: ':userSlug/nuova-recensione', component: AddTestimonial, resolve: { tenant: tenantResolver }, data: { title: 'Nuova Recensione' } },
  { path: ':userSlug/curriculum',component: Curriculum,resolve: { tenant: tenantResolver }, data: { title: 'Curriculum' } },
  { path: ':userSlug/progetti',  component: Progetti,  resolve: { tenant: tenantResolver }, data: { title: 'Progetti' } },
  { path: ':userSlug/attestati', component: Attestati, resolve: { tenant: tenantResolver }, data: { title: 'Attestati' } },
  { path: ':userSlug/attestati/nuovo', component: AddAttestato, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Nuovo Attestato' } },
  { path: ':userSlug/progetti/nuovo', component: AddProject, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Nuovo Progetto' } },
  { path: ':userSlug/contatti',  component: Contatti,  resolve: { tenant: tenantResolver }, data: { title: 'Contatti' } },
  { path: '**', redirectTo: 'about' },
];