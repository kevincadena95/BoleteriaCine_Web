import { Component, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { CineApi, FuncionCine } from "../admin/api.service";
import { Pelicula, PeliculaService } from "../cartelera/pelicula.service";
import { AuthService } from "../login/auth.service";
import { LoginRequerido } from "../login-requerido/login-requerido";

interface FechaBoleteria {
  valor: string;
  dia: string;
  numero: string;
}

@Component({
  selector: "app-boleteria",
  standalone: true,
  imports: [RouterLink, LoginRequerido],
  templateUrl: "./boleteria.html",
  styleUrl: "./boleteria.css",
})
export class Boleteria implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly peliculaService = inject(PeliculaService);
  private readonly cineApi = inject(CineApi);
  private readonly auth = inject(AuthService);

  readonly pelicula = signal<Pelicula | null>(null);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly errorFunciones = signal(false);
  readonly fechaSeleccionada = signal("");
  readonly fechas = signal<FechaBoleteria[]>([]);
  readonly funciones = signal<FuncionCine[]>([]);
  readonly mostrarLoginRequerido = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const slug = this.route.snapshot.paramMap.get("slug");
      const pelicula = slug
        ? await this.peliculaService.obtenerPeliculaPorSlug(slug)
        : undefined;

      if (!pelicula) {
        this.error.set(true);
        return;
      }

      this.pelicula.set(pelicula);

      if (pelicula.estado !== "proximamente") {
        const fechas = this.crearFechasDisponibles();

        this.fechas.set(fechas);
        this.fechaSeleccionada.set(fechas[0].valor);

        await this.cambiarFecha(fechas[0].valor);
      }
    } catch {
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarFecha(fecha: string): Promise<void> {
    this.fechaSeleccionada.set(fecha);
    this.funciones.set([]);
    this.errorFunciones.set(false);

    const pelicula = this.pelicula();
    if (!pelicula) return;

    try {
      const funciones = await this.cineApi.funciones(pelicula.id);

      if (this.fechaSeleccionada() === fecha) {
        const funcionesDelDia = funciones
          .filter((funcion) => funcion.fecha === fecha)
          .sort((a, b) => a.hora.localeCompare(b.hora));

        this.funciones.set(funcionesDelDia);
      }
    } catch {
      this.errorFunciones.set(true);
    }
  }

  async seleccionarFuncion(funcion: FuncionCine): Promise<void> {
    const perfil = await this.auth.obtenerPerfil();

    if (!perfil) {
      this.mostrarLoginRequerido.set(true);
      return;
    }

    const pelicula = this.pelicula();
    if (!pelicula) return;

    void this.router.navigate(["/asientos", funcion.id], {
      queryParams: {
        slug: pelicula.slug,
        pelicula: pelicula.titulo,
        fecha: funcion.fecha,
        formato: `${funcion.formato} · ${funcion.idioma}`,
        sala: funcion.sala.nombre,
        hora: funcion.hora.slice(0, 5),
      },
    });
  }

  cerrarLoginRequerido(): void {
    this.mostrarLoginRequerido.set(false);
  }

  private crearFechasDisponibles(): FechaBoleteria[] {
    return Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date();

      fecha.setHours(12, 0, 0, 0);
      fecha.setDate(fecha.getDate() + indice);

      return {
        valor: this.formatearFecha(fecha),
        dia: new Intl.DateTimeFormat("es-EC", { weekday: "short" }).format(
          fecha,
        ),
        numero: String(fecha.getDate()),
      };
    });
  }

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }
}
