import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder).nonNullable;
  private auth = inject(AuthService);
  private router = inject(Router);
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  error = signal('');
  ocupado = signal(false);
  async entrar() {
    if (this.form.invalid || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      if (!this.auth.esAdmin()) {
        this.error.set('Esta cuenta no tiene acceso de administrador.');
        return;
      }
      await this.router.navigate(['/admin']);
    } catch {
      this.error.set('Credenciales incorrectas o servidor no disponible.');
    } finally {
      this.ocupado.set(false);
    }
  }
}
