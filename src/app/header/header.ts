import { Component, inject } from "@angular/core";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { LucideUser } from "@lucide/angular";
import { AuthService } from "../login/auth.service";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideUser],
  templateUrl: "./header.html",
  styleUrl: "./header.css",
})
export class Header {
  private readonly router = inject(Router);

  readonly auth = inject(AuthService);

  constructor() {
    void this.auth.obtenerPerfil();
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.cerrarSesion();
    await this.router.navigate(["/cartelera"]);
  }
}
