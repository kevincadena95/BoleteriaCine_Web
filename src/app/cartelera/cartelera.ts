import { Component, OnInit, signal, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Pelicula, PeliculaService } from "./pelicula.service";

@Component({
  selector: "app-cartelera",
  standalone: true,
  imports: [],
  templateUrl: "./cartelera.html",
  styleUrl: "./cartelera.css",
})
export class Cartelera implements OnInit {
  private peliculaService = inject(PeliculaService);
  private router = inject(Router);

  peliculas = signal<Pelicula[]>([]);
  categoriaActual = signal("cartelera");
  cargando = signal(true);
  error = signal(false);

  peliculasFiltradas = computed(() => {
    if (this.categoriaActual() === "cartelera") {
      return this.peliculas()
        .filter(
          pelicula =>
            pelicula.estado === "cartelera" ||
            pelicula.estado === "estreno"
        )
        .sort((a, b) => {
          const orden: Record<string, number> = {
            cartelera: 1,
            estreno: 2
          };

          return orden[a.estado] - orden[b.estado];
        });
    }

    return this.peliculas().filter(
      pelicula => pelicula.estado === this.categoriaActual()
    );
  });

  ngOnInit(): void {
    this.cargarPeliculas();
  }

  seleccionarPelicula(pelicula: Pelicula): void {
    this.router.navigate(["/boleteria", pelicula.slug]);
  }

  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(false);

    try {
      const data = await this.peliculaService.obtenerPeliculas();
      this.peliculas.set(data);
    } catch (error) {
      console.error("Error al cargar películas:", error);
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarCategoria(categoria: string): void {
    this.categoriaActual.set(categoria);
  }
}