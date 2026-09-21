import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AsientosService } from '../asientos/asientos.service';
import { CompraActiva, CompraService } from '../compra/compra.service';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css'
})
export class Confirmacion implements OnInit {
  private readonly router = inject(Router);
  private readonly asientosService = inject(AsientosService);

  readonly compraService = inject(CompraService);
  readonly confirmada = signal(false);
  readonly procesando = signal(false);
  readonly errorCompra = signal('');
  readonly compraMostrada = signal<CompraActiva | null>(null);
  readonly codigoReserva = signal('');

  readonly asientosTexto = computed(() => {
    return this.compraMostrada()
      ?.asientos
      .map(asiento => asiento.id)
      .join(', ') ?? '';
  });

  readonly subtotalAsientos = computed(() => {
    return this.compraMostrada()?.asientos.reduce(
      (total, asiento) => total + asiento.precio,
      0
    ) ?? 0;
  });

  readonly subtotalDulceria = computed(() => {
    return this.compraMostrada()?.dulceria.reduce(
      (total, item) => total + item.precioUnitario * item.cantidad,
      0
    ) ?? 0;
  });

  readonly total = computed(() => {
    return this.subtotalAsientos() + this.subtotalDulceria();
  });

  ngOnInit(): void {
    const compra = this.compraService.compra();

    if (!compra) {
      void this.router.navigate(['/cartelera']);
      return;
    }

    this.compraMostrada.set(compra);
    this.codigoReserva.set(
      `MC-${compra.funcion.funcionId.slice(-8).toUpperCase()}`
    );
  }

  async confirmarCompra(): Promise<void> {
    const compra = this.compraMostrada();

    if (!compra || this.confirmada() || this.procesando()) return;

    this.procesando.set(true);
    this.errorCompra.set('');

    try {
      const respuesta = await this.compraService.registrarEnBackend();
      const entrada = this.compraService.confirmarCompra(respuesta.id);

      if (entrada) {
        for (const asiento of compra.asientos) {
          this.asientosService.enviarAccionAsiento(
            compra.funcion.funcionId,
            asiento.id,
            'OCUPADO'
          );
        }

        this.compraMostrada.set(entrada);
        this.codigoReserva.set(entrada.codigo);
        this.confirmada.set(true);
      }
    } catch (error) {
      const respuesta = error as HttpErrorResponse;

      this.errorCompra.set(
        respuesta.error?.error
          || respuesta.message
          || 'No se pudo guardar la compra.'
      );
    } finally {
      this.procesando.set(false);
    }
  }

  cancelarCompra(): void {
    const compra = this.compraMostrada();

    if (compra) {
      for (const asiento of compra.asientos) {
        this.asientosService.enviarAccionAsiento(
          compra.funcion.funcionId,
          asiento.id,
          'LIBRE'
        );
      }
    }

    this.compraService.limpiar();
    void this.router.navigate(['/cartelera']);
  }
}
