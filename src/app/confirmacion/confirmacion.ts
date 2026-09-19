import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AsientosService } from '../asientos/asientos.service';
import { CompraActiva, CompraService } from '../compra/compra.service';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './confirmacion.html',
  styleUrls: ['./confirmacion.css'],
})

export class Confirmacion implements OnInit {
  private router = inject(Router);
  private asientosService = inject(AsientosService);
  compraService = inject(CompraService);
  confirmada = signal(false);
  compraMostrada = signal<CompraActiva | null>(null);
  codigoReserva = signal('');
  asientosTexto = computed(
    () =>
      this.compraMostrada()
        ?.asientos.map((asiento) => asiento.id)
        .join(', ') ?? '',
  );
  subtotalAsientos = computed(
    () =>
      this.compraMostrada()?.asientos.reduce((total, asiento) => total + asiento.precio, 0) ?? 0,
  );
  subtotalDulceria = computed(
    () =>
      this.compraMostrada()?.dulceria.reduce(
        (total, item) => total + item.precioUnitario * item.cantidad,
        0,
      ) ?? 0,
  );
  total = computed(() => this.subtotalAsientos() + this.subtotalDulceria());

  ngOnInit(): void {
    const compra = this.compraService.compra();
    if (!compra) {
      this.router.navigate(['/cartelera']);
      return;
    }
    this.compraMostrada.set(compra);
    this.codigoReserva.set(`MC-${compra.funcion.funcionId.slice(-8).toUpperCase()}`);
  }

  confirmarCompra(): void {
    const compra = this.compraMostrada();
    if (!compra || this.confirmada()) return;

    // En producción, el backend debe validar y confirmar la compra de forma atómica.
    // El modo local marca los asientos como OCUPADO para simular esa confirmación.
    for (const asiento of compra.asientos) {
      this.asientosService.enviarAccionAsiento(compra.funcion.funcionId, asiento.id, 'OCUPADO');
    }
    const entrada = this.compraService.confirmarCompra();
    if (entrada) {
      this.compraMostrada.set(entrada);
      this.codigoReserva.set(entrada.codigo);
      this.confirmada.set(true);
    }
  }

  cancelarCompra(): void {
    const compra = this.compraMostrada();
    if (compra) {
      for (const asiento of compra.asientos) {
        this.asientosService.enviarAccionAsiento(compra.funcion.funcionId, asiento.id, 'LIBRE');
      }
    }
    this.compraService.limpiar();
    this.router.navigate(['/cartelera']);
  }
}
