import { Routes } from '@angular/router';
import { App } from './app';
import { About } from './pages/about/about';
import { Contatti } from './pages/contatti/contatti';
import { Curriculum } from './pages/curriculum/curriculum';
import { Progetti } from './pages/progetti/progetti';

export const routes: Routes = [
    {
        path: '',
        component: App,
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'about' },
            { path: 'about', component: About },
            { path: 'about', component: Contatti },
            { path: 'about', component: Curriculum },
            { path: 'about', component: Progetti },
        ],
    },
    { path: '**', redirectTo: '' },
];
