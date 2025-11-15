// app.routes.ts
import { Routes } from '@angular/router';
import { About } from './pages/about/about';
import { Contatti } from './pages/contatti/contatti';
import { Curriculum } from './pages/curriculum/curriculum';
import { Progetti } from './pages/progetti/progetti';
import { Attestati } from './pages/attestati/attestati';
import { JobOffers } from './pages/job-offers/job-offers';
import { JobOffersStatsView } from './pages/job-offers/views/job-offers-stats-view/job-offers-stats-view';
import { JobOffersEmailView } from './pages/job-offers/views/job-offers-email-view/job-offers-email-view';
import { JobOffersAddView } from './pages/job-offers/views/job-offers-add-view/job-offers-add-view';
import { JobOffersScraperResultsView } from './pages/job-offers/views/job-offers-scraper-results-view/job-offers-scraper-results-view';
import { AddTestimonial } from './components/add-testimonial/add-testimonial';
import { AddAttestato } from './components/add-attestato/add-attestato';
import { AddProject } from './components/add-project/add-project';
import { tenantResolver } from './core/tenant/tenant.resolver';
import { clearTenantResolver } from './core/tenant/clear-tenant.resolver';
import { authGuard } from './guards/auth.guard';
import { slugWildcardGuard } from './core/redirects/slug-wildcard.guard';

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
  { path: 'job-offers', component: JobOffers, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Offerte Lavorative' } },
  { path: 'job-offers/add', component: JobOffersAddView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Aggiungi Candidatura' } },
  { path: 'job-offers/search-results', component: JobOffersScraperResultsView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Risultati Ricerca' } },
  { path: 'job-offers/total', component: JobOffersStatsView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Tutte le Candidature' } },
  { path: 'job-offers/pending', component: JobOffersStatsView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Candidature in Attesa' } },
  { path: 'job-offers/interview', component: JobOffersStatsView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Colloqui' } },
  { path: 'job-offers/accepted', component: JobOffersStatsView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Candidature Accettate' } },
  { path: 'job-offers/rejected', component: JobOffersStatsView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Candidature Rifiutate' } },
  { path: 'job-offers/archived', component: JobOffersStatsView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Candidature Archiviate' } },
  { path: 'job-offers/email-total', component: JobOffersEmailView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Email Totali' } },
  { path: 'job-offers/email-sent', component: JobOffersEmailView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Email Inviate' } },
  { path: 'job-offers/email-received', component: JobOffersEmailView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Email Ricevute' } },
  { path: 'job-offers/email-bcc', component: JobOffersEmailView, canActivate: [authGuard], resolve: { clearTenant: clearTenantResolver }, data: { title: 'Destinatari Nascosti' } },
  // Rotte con prefisso slug utente
  { path: ':userSlug/about',     component: About,     resolve: { tenant: tenantResolver }, data: { title: 'Chi sono' } },
  { path: ':userSlug/nuova-recensione', component: AddTestimonial, resolve: { tenant: tenantResolver }, data: { title: 'Nuova Recensione' } },
  { path: ':userSlug/curriculum',component: Curriculum,resolve: { tenant: tenantResolver }, data: { title: 'Curriculum' } },
  { path: ':userSlug/progetti',  component: Progetti,  resolve: { tenant: tenantResolver }, data: { title: 'Progetti' } },
  { path: ':userSlug/attestati', component: Attestati, resolve: { tenant: tenantResolver }, data: { title: 'Attestati' } },
  { path: ':userSlug/attestati/nuovo', component: AddAttestato, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Nuovo Attestato' } },
  { path: ':userSlug/progetti/nuovo', component: AddProject, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Nuovo Progetto' } },
  { path: ':userSlug/contatti',  component: Contatti,  resolve: { tenant: tenantResolver }, data: { title: 'Contatti' } },
  { path: ':userSlug/job-offers', component: JobOffers, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Offerte Lavorative' } },
  { path: ':userSlug/job-offers/add', component: JobOffersAddView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Aggiungi Candidatura' } },
  { path: ':userSlug/job-offers/search-results', component: JobOffersScraperResultsView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Risultati Ricerca' } },
  { path: ':userSlug/job-offers/total', component: JobOffersStatsView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Tutte le Candidature' } },
  { path: ':userSlug/job-offers/pending', component: JobOffersStatsView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Candidature in Attesa' } },
  { path: ':userSlug/job-offers/interview', component: JobOffersStatsView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Colloqui' } },
  { path: ':userSlug/job-offers/accepted', component: JobOffersStatsView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Candidature Accettate' } },
  { path: ':userSlug/job-offers/rejected', component: JobOffersStatsView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Candidature Rifiutate' } },
  { path: ':userSlug/job-offers/archived', component: JobOffersStatsView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Candidature Archiviate' } },
  { path: ':userSlug/job-offers/email-total', component: JobOffersEmailView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Email Totali' } },
  { path: ':userSlug/job-offers/email-sent', component: JobOffersEmailView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Email Inviate' } },
  { path: ':userSlug/job-offers/email-received', component: JobOffersEmailView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Email Ricevute' } },
  { path: ':userSlug/job-offers/email-bcc', component: JobOffersEmailView, canActivate: [authGuard], resolve: { tenant: tenantResolver }, data: { title: 'Destinatari Nascosti' } },
  // Redirect solo slug a slug/about
  { 
    path: ':userSlug', 
    pathMatch: 'full',
    redirectTo: ':userSlug/about'
  },
  // Wildcard catch-all finale con guard per gestire slug
  { 
    path: '**', 
    component: About,
    canActivate: [slugWildcardGuard],
    data: { title: 'Chi sono' } 
  },
];