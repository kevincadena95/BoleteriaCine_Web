import { Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../login/auth.service";

@Component({
  selector: "app-perfil",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./perfil.html",
  styleUrl: "./perfil.css",
})
export class Perfil {
  readonly auth = inject(AuthService);

  readonly iniciales = computed(() => {
    const nombre = this.auth.perfil()?.nombre.trim();

    if (!nombre) return "MC";

    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join("");
  });

  readonly rolVisible = computed(() => {
    return this.auth.perfil()?.rol === "ADMIN" ? "Administrador" : "Cliente";
  });
}
