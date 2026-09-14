import { Component, OnInit } from '@angular/core';
import { Pelicula, PeliculaService } from './pelicula.service';

@Component({
  selector: 'app-cartelera',
  standalone: true,
  imports: [],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.css'
})
export class Cartelera implements OnInit {
  peliculas: Pelicula[] = [];
  categoriaActual = 'cartelera';
  cargando = true;
  error = false;

  constructor(private peliculaService: PeliculaService) {}

  ngOnInit(): void {
    this.cargarPeliculas();
  }

  async cargarPeliculas(): Promise<void> {
    this.cargando = true;
    this.error = false;

    try {
      this.peliculas = await this.peliculaService.obtenerPeliculas();
    } catch (error) {
      console.error('Error al cargar películas:', error);
      this.error = true;
    } finally {
      this.cargando = false;
    }
  }

  cambiarCategoria(categoria: string): void {
    this.categoriaActual = categoria;
  }

  get peliculasFiltradas(): Pelicula[] {
    return this.peliculas.filter(
      pelicula => pelicula.estado === this.categoriaActual
    );
  }
}