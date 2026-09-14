import { Injectable } from '@angular/core';

export interface Pelicula {
  id: number;
  slug: string;
  titulo: string;
  generos: string[];
  duracion: number;
  clasificacion: string;
  sinopsis: string;
  imagen: string;
  trailerUrl: string;
  fechaEstreno: string;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class PeliculaService {
  private peliculas: Pelicula[] = [];

  private cargando = false;

  private readonly url =
    'https://cines-datos-api.kevinledesma014.workers.dev/api/data/peliculas.json';

  async obtenerPeliculas(): Promise<Pelicula[]> {
    if (this.peliculas.length > 0) {
      return this.peliculas;
    }

    if (this.cargando) {
      return new Promise((resolve) => {
        const esperar = (): void => {
          if (!this.cargando) {
            resolve(this.peliculas);
            return;
          }

          setTimeout(esperar, 50);
        };

        esperar();
      });
    }

    this.cargando = true;

    try {
      const respuesta = await fetch(this.url);

      if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status}`);
      }

      const datos: Pelicula[] = await respuesta.json();

      this.peliculas = datos;

      return this.peliculas;
    } finally {
      this.cargando = false;
    }
  }
}