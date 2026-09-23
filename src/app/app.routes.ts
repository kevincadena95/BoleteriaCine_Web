import { Routes } from "@angular/router";
import { Cartelera } from "./cartelera/cartelera";
import { Dulceria } from "./dulceria/dulceria";
import { Asientos } from "./asientos/asientos";
import { Confirmacion } from "./confirmacion/confirmacion";
import { MisEntradas } from "./mis-entradas/mis-entradas";
import { Boleteria } from "./boleteria/boleteria";
import { Admin } from "./admin/admin";
import { Login } from "./login/login";
import { Perfil } from "./perfil/perfil";
import { adminGuard, authGuard, invitadoGuard } from "./guards/auth.guard";

export const routes: Routes = [
  {
    path: "",
    redirectTo: "cartelera",
    pathMatch: "full",
  },
  {
    path: "login",
    component: Login,
    canActivate: [invitadoGuard],
  },
  {
    path: "cartelera",
    component: Cartelera,
  },
  {
    path: "boleteria/:slug",
    component: Boleteria,
  },
  {
    path: "asientos/:funcionId",
    component: Asientos,
    canActivate: [authGuard],
    canDeactivate: [(component: Asientos) => component.confirmarAbandono()],
  },
  {
    path: "dulceria",
    component: Dulceria,
    canDeactivate: [(component: Dulceria) => component.confirmarAbandono()],
  },
  {
    path: "confirmacion",
    component: Confirmacion,
    canActivate: [authGuard],
  },
  {
    path: "mis-entradas",
    component: MisEntradas,
    canActivate: [authGuard],
  },
  {
    path: "perfil",
    component: Perfil,
    canActivate: [authGuard],
  },
  {
    path: "admin",
    component: Admin,
    canActivate: [adminGuard],
  },
  {
    path: "**",
    redirectTo: "cartelera",
  },
];
