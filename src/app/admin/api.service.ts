import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface SalaCine {
  id: number; nombre: string; filas: number; columnas: number; tipoSala: string;
}
export interface FuncionCine {
  id: number; peliculaId: number; tituloPelicula: string; sala: SalaCine;
  fecha: string; hora: string; formato: string; idioma: string;
  precioBase: number; duracionMinutos: number;
}
export type DatosSala = Omit<SalaCine, 'id'>;
export type DatosFuncion = Omit<FuncionCine, 'id' | 'sala'> & { sala: { id: number } };

@Injectable({ providedIn: 'root' })
export class CineApi {
  private http = inject(HttpClient);
  readonly base = 'http://localhost:8080/api';
  salas() { return firstValueFrom(this.http.get<SalaCine[]>(`${this.base}/salas`)); }
  crearSala(datos: DatosSala) { return firstValueFrom(this.http.post<SalaCine>(`${this.base}/salas`, datos, { withCredentials: true })); }
  editarSala(id: number, datos: DatosSala) { return firstValueFrom(this.http.put<SalaCine>(`${this.base}/salas/${id}`, datos, { withCredentials: true })); }
  eliminarSala(id: number) { return firstValueFrom(this.http.delete(`${this.base}/salas/${id}`, { withCredentials: true })); }
  funciones(peliculaId?: number) {
    return firstValueFrom(this.http.get<FuncionCine[]>(`${this.base}/funciones`, {
      params: peliculaId === undefined ? {} : { peliculaId }, withCredentials: true
    }));
  }
  crearFuncion(datos: DatosFuncion) { return firstValueFrom(this.http.post<FuncionCine>(`${this.base}/funciones`, datos, { withCredentials: true })); }
  editarFuncion(id: number, datos: DatosFuncion) { return firstValueFrom(this.http.put<FuncionCine>(`${this.base}/funciones/${id}`, datos, { withCredentials: true })); }
  eliminarFuncion(id: number) { return firstValueFrom(this.http.delete(`${this.base}/funciones/${id}`, { withCredentials: true })); }
}
