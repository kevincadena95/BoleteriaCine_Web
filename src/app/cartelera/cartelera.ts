import { Component, OnInit, signal } from '@angular/core';
import { Pelicula, PeliculaService } from './pelicula.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cartelera',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.css'
})
export class Cartelera implements OnInit {
  peliculas = signal<Pelicula[]>([]);
  categoriaActual = 'cartelera';
  cargando = signal(true);
  error = signal(false);

  constructor(private peliculaService: PeliculaService) { }

  ngOnInit(): void {
    this.cargarPeliculas();
  }

  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(false);

    try {
      const datos = await this.peliculaService.obtenerPeliculas();
      this.peliculas.set(datos);
    } catch (error) {
      console.error('Error al cargar películas:', error);
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarCategoria(categoria: string): void {
    this.categoriaActual = categoria;
  }

  get peliculasFiltradas(): Pelicula[] {
    if (this.categoriaActual === 'cartelera') {
      return this.peliculas()
        .filter(pelicula =>
          pelicula.estado === 'cartelera' ||
          pelicula.estado === 'estreno'
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
      pelicula => pelicula.estado === this.categoriaActual
    );
  }

 
}