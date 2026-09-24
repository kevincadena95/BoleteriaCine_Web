import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject, signal } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { LucideEye, LucideEyeOff } from "@lucide/angular";
import { AuthService } from "../login/auth.service";

@Component({
  selector: "app-registro",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LucideEye, LucideEyeOff],
  templateUrl: "./registro.html",
  styleUrl: "./registro.css",
})
export class Registro {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal("");
  readonly procesando = signal(false);
  readonly mostrarPassword = signal(false);
  readonly mostrarConfirmacion = signal(false);

  readonly formulario = this.fb.group(
    {
      nombre: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ],
      ],
      email: ["", [Validators.required, Validators.email]],
      telefono: ["", Validators.maxLength(10)],
      password: ["", Validators.required],
      confirmarPassword: ["", Validators.required],
    },
    { validators: this.passwordsCoinciden },
  );

  alternarPassword(): void {
    this.mostrarPassword.update((valor) => !valor);
  }

  alternarConfirmacion(): void {
    this.mostrarConfirmacion.update((valor) => !valor);
  }

  async registrar(): Promise<void> {
    if (this.formulario.invalid || this.procesando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.procesando.set(true);
    this.error.set("");

    try {
      const { nombre, email, telefono, password } =
        this.formulario.getRawValue();

      await this.auth.registrarCliente({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
        password,
      });

      await this.router.navigate(["/login"], {
        queryParams: { registro: "exitoso" },
      });
    } catch (error) {
      this.error.set(this.obtenerMensajeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  private passwordsCoinciden(
    control: AbstractControl,
  ): ValidationErrors | null {
    const password = control.get("password")?.value;
    const confirmacion = control.get("confirmarPassword")?.value;

    if (!password || !confirmacion) {
      return null;
    }

    return password === confirmacion ? null : { passwordsDistintos: true };
  }

  private obtenerMensajeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return "No se pudo completar el registro.";
    }

    if (error.status === 0) {
      return "No se pudo conectar con el servidor.";
    }

    if (typeof error.error === "string" && error.error.trim()) {
      return error.error;
    }

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.error && typeof error.error === "object") {
      const mensajes = Object.values(error.error).filter(
        (valor): valor is string => typeof valor === "string",
      );

      if (mensajes.length > 0) {
        return mensajes.join(" ");
      }
    }

    return "No se pudo completar el registro.";
  }
}
