import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CanMatchFn, Router } from '@angular/router';

interface Perfil {
  usuarioActual: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })

export class AuthService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8080/api/auth';
  usuario = signal('');
  esAdmin = signal(false);
  async perfil(): Promise<Perfil | null> {
    try {
      const perfil = await firstValueFrom(
        this.http.get<Perfil>(`${this.base}/perfil`, { withCredentials: true }),
      );
      this.usuario.set(perfil.usuarioActual);
      this.esAdmin.set(perfil.roles.includes('ROLE_ADMIN'));
      return perfil;
    } catch {
      this.usuario.set('');
      this.esAdmin.set(false);
      return null;
    }
  }
  async login(email: string, password: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.base}/login`, { email, password }, { withCredentials: true }),
    );
    await this.perfil();
  }
  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.base}/logout`, {}, { withCredentials: true }));
    this.usuario.set('');
    this.esAdmin.set(false);
  }
}
export const adminGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const perfil = await auth.perfil();
  return perfil?.roles.includes('ROLE_ADMIN') ? true : router.createUrlTree(['/login']);
};
