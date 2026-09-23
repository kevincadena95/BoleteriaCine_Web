import { HttpClient } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";

export type RolUsuario = "ADMIN" | "CLIENTE";

export interface PerfilUsuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: RolUsuario;
  usuarioActual: string;
  roles: string[];
}

interface RespuestaLogin {
  mensaje: string;
  usuario: string;
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: RolUsuario;
  roles: string[];
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = "http://192.168.137.1:8080/api/auth";

  private readonly perfilActual = signal<PerfilUsuario | null>(null);
  private consultaEnCurso: Promise<PerfilUsuario | null> | null = null;

  readonly perfil = this.perfilActual.asReadonly();
  readonly sesionComprobada = signal(false);

  readonly usuario = computed(() => this.perfilActual()?.email ?? null);
  readonly roles = computed(() => this.perfilActual()?.roles ?? []);
  readonly autenticado = computed(() => this.perfilActual() !== null);
  readonly esAdmin = computed(() => this.roles().includes("ROLE_ADMIN"));
  readonly esCliente = computed(() => this.roles().includes("ROLE_CLIENTE"));
  readonly rol = computed<RolUsuario | null>(() => {
    if (this.esAdmin()) return "ADMIN";
    if (this.esCliente()) return "CLIENTE";
    return null;
  });

  async iniciarSesion(email: string, password: string): Promise<PerfilUsuario> {
    const respuesta = await firstValueFrom(
      this.http.post<RespuestaLogin>(
        `${this.apiUrl}/login`,
        { email, password },
        { withCredentials: true },
      ),
    );

    const perfil: PerfilUsuario = {
      id: respuesta.id,
      nombre: respuesta.nombre,
      email: respuesta.email,
      telefono: respuesta.telefono,
      rol: respuesta.rol,
      usuarioActual: respuesta.usuario,
      roles: respuesta.roles,
    };

    sessionStorage.removeItem("cine:compra-activa");
    this.establecerPerfil(perfil);

    return perfil;
  }

  async obtenerPerfil(forzarConsulta = false): Promise<PerfilUsuario | null> {
    if (!forzarConsulta && this.sesionComprobada()) {
      return this.perfilActual();
    }

    if (this.consultaEnCurso) {
      return this.consultaEnCurso;
    }

    this.consultaEnCurso = this.consultarPerfil();

    try {
      return await this.consultaEnCurso;
    } finally {
      this.consultaEnCurso = null;
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }),
      );
    } catch {
    } finally {
      sessionStorage.removeItem("cine:compra-activa");
      localStorage.removeItem("cine:entradas-confirmadas");
      this.limpiarSesion();
    }
  }

  private async consultarPerfil(): Promise<PerfilUsuario | null> {
    try {
      const perfil = await firstValueFrom(
        this.http.get<PerfilUsuario>(`${this.apiUrl}/perfil`, {
          withCredentials: true,
        }),
      );

      this.establecerPerfil(perfil);
      return perfil;
    } catch {
      this.limpiarSesion();
      return null;
    }
  }

  private establecerPerfil(perfil: PerfilUsuario): void {
    this.perfilActual.set(perfil);
    this.sesionComprobada.set(true);
  }

  private limpiarSesion(): void {
    this.perfilActual.set(null);
    this.sesionComprobada.set(true);
  }
}
