import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Pelicula, PeliculaService } from '../cartelera/pelicula.service';
import { AuthService } from '../login/auth.service';
import { CineApi, DatosFuncion, DatosSala, FuncionCine, SalaCine } from './api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})

export class Admin implements OnInit {
  
  private fb = inject(FormBuilder).nonNullable;
  private peliculasApi = inject(PeliculaService);
  private api = inject(CineApi);
  private router = inject(Router);
  auth = inject(AuthService);
  peliculas = signal<Pelicula[]>([]);
  salas = signal<SalaCine[]>([]);
  funciones = signal<FuncionCine[]>([]);
  error = signal('');
  aviso = signal('');
  guardando = signal(false);
  salaEditando = signal<number | null>(null);
  funcionEditando = signal<number | null>(null);
  hoy = new Date().toLocaleDateString('en-CA');
  salaForm = this.fb.group({
    nombre: ['', Validators.required],
    filas: [5, [Validators.required, Validators.min(1), Validators.max(26)]],
    columnas: [8, [Validators.required, Validators.min(1), Validators.max(50)]],
    tipoSala: ['STANDARD', Validators.required],
  });

  funcionForm = this.fb.group({
    peliculaId: [0, [Validators.required, Validators.min(1)]],
    salaId: [0, [Validators.required, Validators.min(1)]],
    fecha: ['', Validators.required],
    hora: ['', Validators.required],
    formato: ['2D', Validators.required],
    idioma: ['DOBLADA', Validators.required],
    precioBase: [6.5, [Validators.required, Validators.min(0.01)]],
  });

  async ngOnInit() {
    try {
      const [peliculas, salas, funciones] = await Promise.all([
        this.peliculasApi.obtenerPeliculas(),
        this.api.salas(),
        this.api.funciones(),
      ]);
      this.peliculas.set(peliculas);
      this.salas.set(salas);
      this.funciones.set(funciones);
    } catch {
      this.error.set(
        'No se pudo cargar la administración. Revisa la API de películas y el backend.',
      );
    }
  }
  mensajeError(e: unknown): string {
    const error = e as { error?: { error?: string; message?: string } | string; status?: number };
    if (error.status === 401 || error.status === 403)
      return 'Sesión vencida o acceso denegado. Vuelve a ingresar.';
    if (typeof error.error === 'string') return error.error;
    return (
      error.error?.error ||
      error.error?.message ||
      'No se pudo guardar. Revisa los datos y la conexión.'
    );
  }
  async guardarSala() {
    if (this.salaForm.invalid || this.guardando()) {
      this.salaForm.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    try {
      const datos: DatosSala = this.salaForm.getRawValue();
      const id = this.salaEditando();
      if (id === null) await this.api.crearSala(datos);
      else await this.api.editarSala(id, datos);
      this.salas.set(await this.api.salas());
      this.cancelarSala();
      this.aviso.set('Sala guardada correctamente.');
    } catch (e) {
      this.error.set(this.mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }
  editarSala(sala: SalaCine) {
    this.salaEditando.set(sala.id);
    this.salaForm.setValue({
      nombre: sala.nombre,
      filas: sala.filas,
      columnas: sala.columnas,
      tipoSala: sala.tipoSala,
    });
  }
  cancelarSala() {
    this.salaEditando.set(null);
    this.salaForm.reset({ nombre: '', filas: 5, columnas: 8, tipoSala: 'STANDARD' });
  }
  async borrarSala(sala: SalaCine) {
    if (!confirm(`¿Eliminar ${sala.nombre}?`)) return;
    try {
      await this.api.eliminarSala(sala.id);
      this.salas.set(await this.api.salas());
      this.aviso.set('Sala eliminada.');
      this.error.set('');
    } catch (e) {
      this.error.set(this.mensajeError(e));
    }
  }
  async guardarFuncion() {
    if (this.funcionForm.invalid || this.guardando()) {
      this.funcionForm.markAllAsTouched();
      return;
    }
    const valores = this.funcionForm.getRawValue();
    const pelicula = this.peliculas().find((p) => p.id === Number(valores.peliculaId));
    if (!pelicula || !Number.isFinite(pelicula.duracion) || pelicula.duracion <= 0) {
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
      precioBase: Number(valores.precioBase),
    };
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    try {
      const id = this.funcionEditando();
      if (id === null) await this.api.crearFuncion(datos);
      else await this.api.editarFuncion(id, datos);
      this.funciones.set(await this.api.funciones());
      this.cancelarFuncion();
      this.aviso.set('Función guardada y disponible en boletería.');
    } catch (e) {
      this.error.set(this.mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }
  editarFuncion(funcion: FuncionCine) {
    this.funcionEditando.set(funcion.id);
    this.funcionForm.setValue({
      peliculaId: funcion.peliculaId,
      salaId: funcion.sala.id,
      fecha: funcion.fecha,
      hora: funcion.hora.slice(0, 5),
      formato: funcion.formato,
      idioma: funcion.idioma,
      precioBase: funcion.precioBase,
    });
  }
  cancelarFuncion() {
    this.funcionEditando.set(null);
    this.funcionForm.reset({
      peliculaId: 0,
      salaId: 0,
      fecha: '',
      hora: '',
      formato: '2D',
      idioma: 'DOBLADA',
      precioBase: 6.5,
    });
  }
  async borrarFuncion(funcion: FuncionCine) {
    if (!confirm(`¿Eliminar la función de ${funcion.tituloPelicula} del ${funcion.fecha}?`)) return;
    try {
      await this.api.eliminarFuncion(funcion.id);
      this.funciones.set(await this.api.funciones());
      this.aviso.set('Función eliminada.');
      this.error.set('');
    } catch (e) {
      this.error.set(this.mensajeError(e));
    }
  }
  async salir() {
    await this.auth.logout();
    await this.router.navigate(['/cartelera']);
  }
}
