import { Routes } from '@angular/router';
import { Cartelera } from './cartelera/cartelera';
import { Dulceria } from './dulceria/dulceria';
import { Boleteria } from './boleteria/boleteria';

export const routes: Routes = [
  { path: '', redirectTo: 'cartelera', pathMatch: 'full' },
  { path: 'cartelera', component: Cartelera },
  {path: 'boleteria/:slug',component: Boleteria},
  { path: 'dulceria', component: Dulceria },
  { path: '**', redirectTo: 'cartelera' }
];