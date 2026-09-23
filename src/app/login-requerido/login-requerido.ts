import { Component, EventEmitter, Output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { LucideUser } from "@lucide/angular";

@Component({
  selector: "app-login-requerido",
  standalone: true,
  imports: [RouterLink, LucideUser],
  templateUrl: "./login-requerido.html",
  styleUrl: "./login-requerido.css",
})
export class LoginRequerido {
  @Output() cerrar = new EventEmitter<void>();
}
