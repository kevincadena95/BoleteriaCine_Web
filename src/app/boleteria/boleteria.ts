import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Pelicula, PeliculaService } from '../cartelera/pelicula.service';
import { CineApi, FuncionCine } from '../admin/api.service';

@Component({
  selector: 'app-boleteria',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './boleteria.html',
  styleUrl: './boleteria.css',
})

export class Boleteria implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private peliculaService = inject(PeliculaService);
  private api = inject(CineApi);
  pelicula = signal<Pelicula | null>(null);
  cargando = signal(true);
  error = signal(false);
  errorFunciones = signal(false);
  fechaSeleccionada = signal('');
  fechas = signal<{ valor: string; dia: string; numero: string }[]>([]);
  funciones = signal<FuncionCine[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const slug = this.route.snapshot.paramMap.get('slug');
      const pelicula = slug ? await this.peliculaService.obtenerPeliculaPorSlug(slug) : undefined;
      if (!pelicula) {
        this.error.set(true);
        return;
      }
      this.pelicula.set(pelicula);
      if (pelicula.estado !== 'proximamente') {
        const fechas = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setHours(12, 0, 0, 0);
          d.setDate(d.getDate() + i);
          return {
            valor: this.fechaLocal(d),
            dia: new Intl.DateTimeFormat('es-EC', { weekday: 'short' }).format(d),
            numero: String(d.getDate()),
          };
        });
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
  private fechaLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  async cambiarFecha(fecha: string): Promise<void> {
    this.fechaSeleccionada.set(fecha);
    this.funciones.set([]);
    this.errorFunciones.set(false);
    const peli = this.pelicula();
    if (!peli) return;
    try {
      const funciones = await this.api.funciones(peli.id);
      if (this.fechaSeleccionada() === fecha)
        this.funciones.set(
          funciones.filter((f) => f.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora)),
        );
    } catch {
      this.errorFunciones.set(true);
    }
  }
  seleccionarFuncion(funcion: FuncionCine): void {
    const peli = this.pelicula();
    if (!peli) return;
    this.router.navigate(['/asientos', funcion.id], {
      queryParams: {
        slug: peli.slug,
        pelicula: peli.titulo,
        fecha: funcion.fecha,
        formato: `${funcion.formato} · ${funcion.idioma}`,
        sala: funcion.sala.nombre,
        hora: funcion.hora.slice(0, 5),
      },
    });
  }
}
