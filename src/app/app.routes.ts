import { Routes } from '@angular/router';
import { Cartelera } from './cartelera/cartelera';
import { Dulceria } from './dulceria/dulceria';
import { Asientos } from './asientos/asientos';
import { Confirmacion } from './confirmacion/confirmacion';
import { MisEntradas } from './mis-entradas/mis-entradas';
import { Boleteria } from './boleteria/boleteria';
import { Admin } from './admin/admin';
import { Login } from './login/login';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'cartelera',
    component: Cartelera
  },
  {
    path: 'boleteria/:slug',
    component: Boleteria
  },
  {
    path: 'asientos/:funcionId',
    component: Asientos,
    canDeactivate: [
      (component: Asientos) => component.confirmarAbandono()
    ]
  },
  {
    path: 'dulceria',
    component: Dulceria
  },
  {
    path: 'confirmacion',
    component: Confirmacion
  },
  {
    path: 'mis-entradas',
    component: MisEntradas
  },
  {
    path: 'admin',
    component: Admin
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
