import { Component, EventEmitter, Output } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-login-requerido",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./login-requerido.html",
  styleUrl: "./login-requerido.css",
})
export class LoginRequerido {
  @Output() cerrar = new EventEmitter<void>();
}
