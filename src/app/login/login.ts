import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { LucideEye, LucideEyeOff } from "@lucide/angular";
import { AuthService } from "./auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LucideEye, LucideEyeOff],
  templateUrl: "./login.html",
  styleUrl: "./login.css",
})
export class Login {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly error = signal("");
  readonly mensaje = signal("");
  readonly procesando = signal(false);
  readonly mostrarPassword = signal(false);

  readonly formulario = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", Validators.required],
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get("registro") === "exitoso") {
      this.mensaje.set(
        "Cuenta creada correctamente. Ya puedes iniciar sesión.",
      );
    }
  }

  alternarPassword(): void {
    this.mostrarPassword.update((valor) => !valor);
  }

  async iniciarSesion(): Promise<void> {
    if (this.formulario.invalid || this.procesando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.procesando.set(true);
    this.error.set("");
    this.mensaje.set("");

    try {
      const { email, password } = this.formulario.getRawValue();
      const perfil = await this.auth.iniciarSesion(email, password);
      const esAdministrador = perfil.roles.includes("ROLE_ADMIN");
      const esCliente = perfil.roles.includes("ROLE_CLIENTE");

      if (!esAdministrador && !esCliente) {
        await this.auth.cerrarSesion();
        this.error.set("La cuenta no tiene un rol autorizado para ingresar.");
        return;
      }

      await this.router.navigate(["/cartelera"]);
    } catch {
      this.error.set("Correo o contraseña incorrectos.");
    } finally {
      this.procesando.set(false);
    }
  }
}
