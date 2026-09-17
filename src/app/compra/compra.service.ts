import { Injectable, computed, signal } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly claveSesion = 'cine:compra-activa';
  private readonly claveHistorial = 'cine:entradas-confirmadas';
  compra = signal<CompraActiva | null>(this.leerSesion());
  entradas = signal<EntradaConfirmada[]>(this.leerHistorial());
  subtotalAsientos = computed(() => this.compra()?.asientos.reduce((total, asiento) => total + asiento.precio, 0) ?? 0);
  subtotalDulceria = computed(() => this.compra()?.dulceria.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0) ?? 0);
  total = computed(() => this.subtotalAsientos() + this.subtotalDulceria());

  guardarReserva(funcion: DetalleFuncion, asientos: Asiento[]): void {
    this.guardar({ funcion, asientos, dulceria: this.compra()?.dulceria ?? [] });
  }

  guardarDulceria(dulceria: ItemDulceriaResumen[]): void {
    const actual = this.compra();
    if (actual) this.guardar({ ...actual, dulceria });
  }

  limpiar(): void {
    sessionStorage.removeItem(this.claveSesion);
    this.compra.set(null);
  }

  confirmarCompra(): EntradaConfirmada | null {
    const actual = this.compra();
    if (!actual) return null;

    const entrada: EntradaConfirmada = {
      ...actual,
      codigo: `MC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
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
    return almacenada ? JSON.parse(almacenada) as CompraActiva : null;
  }

  private leerHistorial(): EntradaConfirmada[] {
    const almacenado = localStorage.getItem(this.claveHistorial);
    return almacenado ? JSON.parse(almacenado) as EntradaConfirmada[] : [];
  }
}
