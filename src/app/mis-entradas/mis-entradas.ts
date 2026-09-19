import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompraService } from '../compra/compra.service';

@Component({
  selector: 'app-mis-entradas',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './mis-entradas.html',
  styleUrls: ['./mis-entradas.css'],
})
export class MisEntradas {
  compraService = inject(CompraService);

  total(entradaIndex: number): number {
    const entrada = this.compraService.entradas()[entradaIndex];
    return (
      entrada.asientos.reduce((suma, asiento) => suma + asiento.precio, 0) +
      entrada.dulceria.reduce((suma, item) => suma + item.precioUnitario * item.cantidad, 0)
    );
  }

  asientosTexto(entradaIndex: number): string {
    return this.compraService
      .entradas()
      [entradaIndex].asientos.map((asiento) => asiento.id)
      .join(', ');
  }
}
