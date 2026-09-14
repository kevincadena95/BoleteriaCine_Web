import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Pelicula, PeliculaService } from '../cartelera/pelicula.service';

@Component({
  selector: 'app-boleteria',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './boleteria.html',
  styleUrl: './boleteria.css'
})
export class Boleteria implements OnInit {
  pelicula = signal<Pelicula | null>(null);
  cargando = signal(true);
  error = signal(false);

  fechaSeleccionada = signal('17');

  fechas = [
    { dia: 'Jue.', numero: '17' },
    { dia: 'Vie.', numero: '18' },
    { dia: 'Sáb.', numero: '19' },
    { dia: 'Dom.', numero: '20' },
    { dia: 'Lun.', numero: '21' },
    { dia: 'Mar.', numero: '22' },
    { dia: 'Mié.', numero: '23' }
  ];

  funcionesPorFecha: Record<string, any[]> = {
    '17': [
      {
        formato: '2D-Esp',
        sala: 'SALA NORMAL',
        horarios: ['13:00', '14:30', '15:15', '16:45', '17:30', '19:00']
      },
      {
        formato: '4D-Esp',
        sala: 'SALA 4D',
        horarios: ['13:45', '16:00', '18:15', '20:25']
      }
    ],

    '18': [
      {
        formato: '2D-Esp',
        sala: 'SALA NORMAL',
        horarios: ['12:00', '14:00', '16:00', '18:00', '20:00']
      },
      {
        formato: '3D-Esp',
        sala: 'SALA 3D',
        horarios: ['15:30', '18:30', '21:30']
      }
    ],

    '19': [
      {
        formato: '2D-Esp',
        sala: 'SALA NORMAL',
        horarios: ['11:30', '13:45', '16:15', '19:00', '21:30']
      }
    ],

    '20': [
      {
        formato: '4D-Esp',
        sala: 'SALA 4D',
        horarios: ['13:00', '15:30', '18:00', '20:30']
      }
    ],

    '21': [
      {
        formato: '2D-Esp',
        sala: 'SALA NORMAL',
        horarios: ['14:00', '16:30', '19:00', '21:15']
      }
    ],

    '22': [
      {
        formato: '2D-Esp',
        sala: 'SALA NORMAL',
        horarios: ['15:00', '17:30', '20:00']
      },
      {
        formato: '4D-Esp',
        sala: 'SALA 4D',
        horarios: ['16:00', '19:00']
      }
    ],

    '23': [
      {
        formato: '2D-Esp',
        sala: 'SALA NORMAL',
        horarios: ['13:30', '16:00', '18:30', '21:00']
      }
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private peliculaService: PeliculaService
  ) { }

  ngOnInit(): void {
    this.cargarPelicula();
  }

  async cargarPelicula(): Promise<void> {
    this.cargando.set(true);
    this.error.set(false);

    try {
      const slug = this.route.snapshot.paramMap.get('slug');

      if (!slug) {
        this.error.set(true);
        return;
      }

      const pelicula = await this.peliculaService.obtenerPeliculaPorSlug(slug);

      if (!pelicula) {
        this.error.set(true);
        return;
      }

      this.pelicula.set(pelicula);
    } catch (error) {
      console.error('Error al cargar película:', error);
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
  }

  get funciones(): any[] {
    return this.funcionesPorFecha[this.fechaSeleccionada()] || [];
  }
}