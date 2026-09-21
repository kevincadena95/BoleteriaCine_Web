import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type RolUsuario = 'ADMIN' | 'CLIENTE';

export interface PerfilUsuario {
  usuarioActual: string;
  roles: string[];
}

interface RespuestaLogin {
  mensaje: string;
  usuario: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/auth';

  readonly usuario = signal<string | null>(null);
  readonly roles = signal<string[]>([]);

  readonly autenticado = computed(() => this.usuario() !== null);
  readonly esAdmin = computed(() => this.roles().includes('ROLE_ADMIN'));
  readonly esCliente = computed(() => this.roles().includes('ROLE_CLIENTE'));
  readonly rol = computed<RolUsuario | null>(() => {
    if (this.esAdmin()) return 'ADMIN';
    if (this.esCliente()) return 'CLIENTE';
    return null;
  });

  async iniciarSesion(email: string, password: string): Promise<PerfilUsuario> {
    const respuesta = await firstValueFrom(
      this.http.post<RespuestaLogin>(
        `${this.apiUrl}/login`,
        { email, password },
        { withCredentials: true }
      )
    );

    const perfil: PerfilUsuario = {
      usuarioActual: respuesta.usuario,
      roles: respuesta.roles
    };

    this.establecerPerfil(perfil);
    return perfil;
  }

  async obtenerPerfil(): Promise<PerfilUsuario | null> {
    try {
      const perfil = await firstValueFrom(
        this.http.get<PerfilUsuario>(
          `${this.apiUrl}/perfil`,
          { withCredentials: true }
        )
      );

      this.establecerPerfil(perfil);
      return perfil;
    } catch {
      this.limpiarSesion();
      return null;
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/logout`,
          {},
          { withCredentials: true }
        )
      );
    } catch {
      // La sesión local también se limpia si el servidor ya la había cerrado.
    } finally {
      this.limpiarSesion();
    }
  }

  private establecerPerfil(perfil: PerfilUsuario): void {
    this.usuario.set(perfil.usuarioActual);
    this.roles.set(perfil.roles);
  }

  private limpiarSesion(): void {
    this.usuario.set(null);
    this.roles.set([]);
  }
}
