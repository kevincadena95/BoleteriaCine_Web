import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideClapperboard } from '@lucide/angular';
import {
  CompraService,
  EntradaUsuario
} from '../compra/compra.service';
import { PeliculaService } from '../cartelera/pelicula.service';

@Component({
  selector: 'app-mis-entradas',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, LucideClapperboard],
  templateUrl: './mis-entradas.html',
  styleUrl: './mis-entradas.css'
})
export class MisEntradas implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly peliculaService = inject(PeliculaService);

  readonly entradas = signal<EntradaUsuario[]>([]);
  readonly imagenesPeliculas = signal<Record<string, string>>({});
  readonly cargando = signal(true);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    await this.cargarEntradas();
  }

  async cargarEntradas(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      const entradas = await this.compraService.obtenerMisEntradas();

      this.entradas.set(entradas);
      await this.cargarImagenesPeliculas();
    } catch {
      this.error.set(
        'No se pudieron cargar tus boletos. Inténtalo nuevamente.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  imagenPelicula(entrada: EntradaUsuario): string | null {
    const clave = this.normalizarTitulo(entrada.pelicula);

    return this.imagenesPeliculas()[clave] ?? null;
  }

  asientosTexto(entrada: EntradaUsuario): string {
    return entrada.asientos.join(', ');
  }

  private async cargarImagenesPeliculas(): Promise<void> {
    try {
      const peliculas = await this.peliculaService.obtenerPeliculas();
      const imagenes: Record<string, string> = {};

      for (const pelicula of peliculas) {
        const clave = this.normalizarTitulo(pelicula.titulo);
        imagenes[clave] = pelicula.imagen;
      }

      this.imagenesPeliculas.set(imagenes);
    } catch {
      this.imagenesPeliculas.set({});
    }
  }

  private normalizarTitulo(titulo: string): string {
    return titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}