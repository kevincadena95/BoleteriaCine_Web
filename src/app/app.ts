import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Header } from './header/header';
import { Footer } from './footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);

  readonly mostrarEstructura = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter(
          (evento): evento is NavigationEnd =>
            evento instanceof NavigationEnd
        )
      )
      .subscribe(evento => {
        const estaEnLogin = evento.urlAfterRedirects.startsWith('/login');
        const estaEnRegistro = evento.urlAfterRedirects.startsWith('/registro');
        this.mostrarEstructura.set(!estaEnLogin && !estaEnRegistro);
      });
  }
}
