import { Routes } from '@angular/router';
import { Cartelera } from './cartelera/cartelera';
import { Dulceria } from './dulceria/dulceria';
import { Asientos } from './asientos/asientos';
import { Confirmacion } from './confirmacion/confirmacion';
import { MisEntradas } from './mis-entradas/mis-entradas';
import { Boleteria } from './boleteria/boleteria';

export const routes: Routes = [
  { path: '', redirectTo: 'cartelera', pathMatch: 'full' },
  { path: 'cartelera', component: Cartelera },
  { 
    path: 'asientos/:funcionId', 
    component: Asientos,
    canDeactivate: [(component: Asientos) => component.confirmarAbandono()]
  },
  {path: 'boleteria/:slug',component: Boleteria},
  { path: 'dulceria', component: Dulceria },
  { path: 'confirmacion', component: Confirmacion },
  { path: 'mis-entradas', component: MisEntradas },
  { path: '**', redirectTo: 'cartelera' }
];