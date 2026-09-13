import { Routes } from '@angular/router';
import { Cartelera } from './cartelera/cartelera';
import { Dulceria } from './dulceria/dulceria';

export const routes: Routes = [
    { path: '', component: Cartelera },
    { path: 'cartelera', component: Cartelera },
    { path: 'dulceria', component: Dulceria },
    { path: '**', redirectTo: 'cartelera' }
];