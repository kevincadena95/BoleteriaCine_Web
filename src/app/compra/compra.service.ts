import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Asiento } from '../asientos/asientos.service';

export interface DetalleFuncion {
  funcionId: string;
  pelicula: string;
  fecha: string;
  hora: string;
  formato: string;
  sala: string;
}

export interface ItemDulceriaResumen {
  id: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CompraActiva {
  funcion: DetalleFuncion;
  asientos: Asiento[];
  dulceria: ItemDulceriaResumen[];
}

export interface EntradaConfirmada extends CompraActiva {
  codigo: string;
  confirmadaEn: string;
}

export interface RespuestaCompra {
  id: number;
  total: number;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly claveSesion = 'cine:compra-activa';
  private readonly claveHistorial = 'cine:entradas-confirmadas';

  readonly compra = signal<CompraActiva | null>(this.leerSesion());
  readonly entradas = signal<EntradaConfirmada[]>(this.leerHistorial());

  readonly subtotalAsientos = computed(() => {
    return this.compra()?.asientos.reduce(
      (total, asiento) => total + asiento.precio,
      0
    ) ?? 0;
  });

  readonly subtotalDulceria = computed(() => {
    return this.compra()?.dulceria.reduce(
      (total, item) => total + item.precioUnitario * item.cantidad,
      0
    ) ?? 0;
  });

  readonly total = computed(() => {
    return this.subtotalAsientos() + this.subtotalDulceria();
  });

  guardarReserva(funcion: DetalleFuncion, asientos: Asiento[]): void {
    this.guardar({
      funcion,
      asientos,
      dulceria: []
    });
  }

  guardarDulceria(dulceria: ItemDulceriaResumen[]): void {
    const actual = this.compra();
    if (actual) this.guardar({ ...actual, dulceria });
  }

  limpiar(): void {
    sessionStorage.removeItem(this.claveSesion);
    this.compra.set(null);
  }

  async registrarEnBackend(): Promise<RespuestaCompra> {
    const actual = this.compra();

    if (!actual) {
      throw new Error('No hay una compra activa');
    }

    if (actual.asientos.some(asiento => !asiento.asientoId)) {
      throw new Error('Recarga el mapa de asientos para obtener los ID de la sala');
    }

    if (actual.dulceria.some(item => !item.id)) {
      throw new Error('Vuelve a escoger los productos de dulcería');
    }

    const solicitud = {
      funcionId: Number(actual.funcion.funcionId),
      asientoIds: actual.asientos.map(asiento => asiento.asientoId),
      snacks: actual.dulceria.map(item => ({
        id: item.id,
        cantidad: item.cantidad
      }))
    };

    return firstValueFrom(
      this.http.post<RespuestaCompra>(
        'http://localhost:8080/api/compras/registrar',
        solicitud,
        { withCredentials: true }
      )
    );
  }

  confirmarCompra(compraId: number): EntradaConfirmada | null {
    const actual = this.compra();
    if (!actual) return null;

    const entrada: EntradaConfirmada = {
      ...actual,
      codigo: `MC-${compraId}`,
      confirmadaEn: new Date().toISOString()
    };
    const historial = [entrada, ...this.entradas()];

    localStorage.setItem(this.claveHistorial, JSON.stringify(historial));
    this.entradas.set(historial);
    this.limpiar();

    return entrada;
  }

  private guardar(compra: CompraActiva): void {
    sessionStorage.setItem(this.claveSesion, JSON.stringify(compra));
    this.compra.set(compra);
  }

  private leerSesion(): CompraActiva | null {
    const almacenada = sessionStorage.getItem(this.claveSesion);

    return almacenada
      ? JSON.parse(almacenada) as CompraActiva
      : null;
  }

  private leerHistorial(): EntradaConfirmada[] {
    const almacenado = localStorage.getItem(this.claveHistorial);

    return almacenado
      ? JSON.parse(almacenado) as EntradaConfirmada[]
      : [];
  }
}
