import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../login/auth.service";

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const perfil = await auth.obtenerPerfil();

  return perfil ? true : router.createUrlTree(["/login"]);
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const perfil = await auth.obtenerPerfil();

  if (!perfil) {
    return router.createUrlTree(["/login"]);
  }

  return perfil.roles.includes("ROLE_ADMIN")
    ? true
    : router.createUrlTree(["/cartelera"]);
};

export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const perfil = await auth.obtenerPerfil();

  return perfil ? router.createUrlTree(["/cartelera"]) : true;
};
