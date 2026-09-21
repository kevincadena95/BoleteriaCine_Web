import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Pelicula, PeliculaService } from '../cartelera/pelicula.service';
import { AuthService } from '../login/auth.service';
import {
  CineApi,
  DatosFuncion,
  DatosSala,
  FuncionCine,
  SalaCine
} from './api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly peliculaService = inject(PeliculaService);
  private readonly cineApi = inject(CineApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly peliculas = signal<Pelicula[]>([]);
  readonly salas = signal<SalaCine[]>([]);
  readonly funciones = signal<FuncionCine[]>([]);

  readonly error = signal('');
  readonly aviso = signal('');
  readonly guardando = signal(false);
  readonly accesoVerificado = signal(false);
  readonly salaEditando = signal<number | null>(null);
  readonly funcionEditando = signal<number | null>(null);

  readonly hoy = new Date().toLocaleDateString('en-CA');

  readonly salaForm = this.fb.group({
    nombre: ['', Validators.required],
    filas: [
      5,
      [Validators.required, Validators.min(1), Validators.max(26)]
    ],
    columnas: [
      8,
      [Validators.required, Validators.min(1), Validators.max(50)]
    ],
    tipoSala: ['STANDARD', Validators.required]
  });

  readonly funcionForm = this.fb.group({
    peliculaId: [0, [Validators.required, Validators.min(1)]],
    salaId: [0, [Validators.required, Validators.min(1)]],
    fecha: ['', Validators.required],
    hora: ['', Validators.required],
    formato: ['2D', Validators.required],
    idioma: ['DOBLADA', Validators.required],
    precioBase: [
      6.5,
      [Validators.required, Validators.min(0.01)]
    ]
  });

  async ngOnInit(): Promise<void> {
    const perfil = await this.auth.obtenerPerfil();

    if (!perfil) {
      await this.router.navigate(['/login']);
      return;
    }

    if (!perfil.roles.includes('ROLE_ADMIN')) {
      await this.router.navigate(['/cartelera']);
      return;
    }

    this.accesoVerificado.set(true);
    await this.cargarDatos();
  }

  async guardarSala(): Promise<void> {
    if (this.salaForm.invalid || this.guardando()) {
      this.salaForm.markAllAsTouched();
      return;
    }

    this.iniciarOperacion();

    try {
      const datos: DatosSala = this.salaForm.getRawValue();
      const id = this.salaEditando();

      if (id === null) {
        await this.cineApi.crearSala(datos);
      } else {
        await this.cineApi.editarSala(id, datos);
      }

      this.salas.set(await this.cineApi.salas());
      this.cancelarEdicionSala();
      this.aviso.set('Sala guardada correctamente.');
    } catch (error) {
      this.error.set(this.obtenerMensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  editarSala(sala: SalaCine): void {
    this.salaEditando.set(sala.id);
    this.salaForm.setValue({
      nombre: sala.nombre,
      filas: sala.filas,
      columnas: sala.columnas,
      tipoSala: sala.tipoSala
    });
  }

  cancelarEdicionSala(): void {
    this.salaEditando.set(null);
    this.salaForm.reset({
      nombre: '',
      filas: 5,
      columnas: 8,
      tipoSala: 'STANDARD'
    });
  }

  async eliminarSala(sala: SalaCine): Promise<void> {
    const confirmado = confirm(`¿Eliminar ${sala.nombre}?`);
    if (!confirmado) return;

    this.limpiarMensajes();

    try {
      await this.cineApi.eliminarSala(sala.id);
      this.salas.set(await this.cineApi.salas());
      this.aviso.set('Sala eliminada correctamente.');
    } catch (error) {
      this.error.set(this.obtenerMensajeError(error));
    }
  }

  async guardarFuncion(): Promise<void> {
    if (this.funcionForm.invalid || this.guardando()) {
      this.funcionForm.markAllAsTouched();
      return;
    }

    const valores = this.funcionForm.getRawValue();
    const pelicula = this.peliculas().find(
      item => item.id === Number(valores.peliculaId)
    );

    if (!pelicula || pelicula.duracion <= 0) {
      this.error.set('Selecciona una película con duración válida.');
      return;
    }

    if (valores.fecha < this.hoy) {
      this.error.set('Selecciona una fecha actual o futura.');
      return;
    }

    const datos: DatosFuncion = {
      peliculaId: pelicula.id,
      tituloPelicula: pelicula.titulo,
      duracionMinutos: pelicula.duracion,
      sala: { id: Number(valores.salaId) },
      fecha: valores.fecha,
      hora: valores.hora,
      formato: valores.formato,
      idioma: valores.idioma,
      precioBase: Number(valores.precioBase)
    };

    this.iniciarOperacion();

    try {
      const id = this.funcionEditando();

      if (id === null) {
        await this.cineApi.crearFuncion(datos);
      } else {
        await this.cineApi.editarFuncion(id, datos);
      }

      this.funciones.set(await this.cineApi.funciones());
      this.cancelarEdicionFuncion();
      this.aviso.set('Función guardada y disponible en boletería.');
    } catch (error) {
      this.error.set(this.obtenerMensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  editarFuncion(funcion: FuncionCine): void {
    this.funcionEditando.set(funcion.id);
    this.funcionForm.setValue({
      peliculaId: funcion.peliculaId,
      salaId: funcion.sala.id,
      fecha: funcion.fecha,
      hora: funcion.hora.slice(0, 5),
      formato: funcion.formato,
      idioma: funcion.idioma,
      precioBase: funcion.precioBase
    });
  }

  cancelarEdicionFuncion(): void {
    this.funcionEditando.set(null);
    this.funcionForm.reset({
      peliculaId: 0,
      salaId: 0,
      fecha: '',
      hora: '',
      formato: '2D',
      idioma: 'DOBLADA',
      precioBase: 6.5
    });
  }

  async eliminarFuncion(funcion: FuncionCine): Promise<void> {
    const confirmado = confirm(
      `¿Eliminar la función de ${funcion.tituloPelicula} del ${funcion.fecha}?`
    );

    if (!confirmado) return;

    this.limpiarMensajes();

    try {
      await this.cineApi.eliminarFuncion(funcion.id);
      this.funciones.set(await this.cineApi.funciones());
      this.aviso.set('Función eliminada correctamente.');
    } catch (error) {
      this.error.set(this.obtenerMensajeError(error));
    }
  }

  private async cargarDatos(): Promise<void> {
    try {
      const [peliculas, salas, funciones] = await Promise.all([
        this.peliculaService.obtenerPeliculas(),
        this.cineApi.salas(),
        this.cineApi.funciones()
      ]);

      this.peliculas.set(peliculas);
      this.salas.set(salas);
      this.funciones.set(funciones);
    } catch {
      this.error.set(
        'No se pudo cargar la administración. Revisa la conexión con el servidor.'
      );
    }
  }

  private iniciarOperacion(): void {
    this.guardando.set(true);
    this.limpiarMensajes();
  }

  private limpiarMensajes(): void {
    this.error.set('');
    this.aviso.set('');
  }

  private obtenerMensajeError(error: unknown): string {
    const respuesta = error as {
      error?: { error?: string; message?: string } | string;
      status?: number;
    };

    if (respuesta.status === 401 || respuesta.status === 403) {
      return 'La sesión venció o no tienes permiso para realizar esta acción.';
    }

    if (typeof respuesta.error === 'string') {
      return respuesta.error;
    }

    return respuesta.error?.error
      || respuesta.error?.message
      || 'No se pudo completar la operación.';
  }
}
