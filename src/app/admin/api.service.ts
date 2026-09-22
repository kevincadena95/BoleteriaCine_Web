import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface SalaCine {
  id: number;
  nombre: string;
  filas: number;
  columnas: number;
  tipoSala: string;
}

export interface FuncionCine {
  id: number;
  peliculaId: number;
  tituloPelicula: string;
  sala: SalaCine;
  fecha: string;
  hora: string;
  formato: string;
  idioma: string;
  precioBase: number;
  duracionMinutos: number;
}

export type DatosSala = Omit<SalaCine, 'id'>;

export type DatosFuncion = Omit<FuncionCine, 'id' | 'sala'> & {
  sala: { id: number };
};

@Injectable({ providedIn: 'root' })
export class CineApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api';

  salas(): Promise<SalaCine[]> {
    return firstValueFrom(
      this.http.get<SalaCine[]>(
        `${this.apiUrl}/salas`,
        { withCredentials: true }
      )
    );
  }

  crearSala(datos: DatosSala): Promise<SalaCine> {
    return firstValueFrom(
      this.http.post<SalaCine>(
        `${this.apiUrl}/salas`,
        datos,
        { withCredentials: true }
      )
    );
  }

  editarSala(id: number, datos: DatosSala): Promise<SalaCine> {
    return firstValueFrom(
      this.http.put<SalaCine>(
        `${this.apiUrl}/salas/${id}`,
        datos,
        { withCredentials: true }
      )
    );
  }

  eliminarSala(id: number): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(
        `${this.apiUrl}/salas/${id}`,
        { withCredentials: true }
      )
    );
  }

  funciones(peliculaId?: number) {
    return firstValueFrom(
      this.http.get<FuncionCine[]>(
        `${this.apiUrl}/funciones`,
        {
          params: peliculaId === undefined ? {} : { peliculaId },
          withCredentials: true
        }
      )
    );
  }

  crearFuncion(datos: DatosFuncion): Promise<FuncionCine> {
    return firstValueFrom(
      this.http.post<FuncionCine>(
        `${this.apiUrl}/funciones`,
        datos,
        { withCredentials: true }
      )
    );
  }

  editarFuncion(
    id: number,
    datos: DatosFuncion
  ): Promise<FuncionCine> {
    return firstValueFrom(
      this.http.put<FuncionCine>(
        `${this.apiUrl}/funciones/${id}`,
        datos,
        { withCredentials: true }
      )
    );
  }

  eliminarFuncion(id: number): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(
        `${this.apiUrl}/funciones/${id}`,
        { withCredentials: true }
      )
    );
  }
}
