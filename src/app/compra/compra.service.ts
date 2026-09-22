import { HttpClient } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { Asiento } from "../asientos/asientos.service";

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
  funcion: DetalleFuncion | null;
  asientos: Asiento[];
  dulceria: ItemDulceriaResumen[];
}

export interface RespuestaCompra {
  id: number;
  total: number;
  estado: string;
}

export interface SnackEntrada {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface EntradaUsuario {
  id: number;
  codigo: string;
  fechaCompra: string;
  total: number;
  estado: string;
  pelicula: string;
  fechaFuncion: string;
  hora: string;
  formato: string;
  idioma: string;
  sala: string;
  asientos: string[];
  snacks: SnackEntrada[];
}

@Injectable({ providedIn: "root" })
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = "http://localhost:8080/api/compras";
  private readonly claveSesion = "cine:compra-activa";

  readonly compra = signal<CompraActiva | null>(this.leerSesion());

  readonly subtotalAsientos = computed(() => {
    return (
      this.compra()?.asientos.reduce(
        (total, asiento) => total + asiento.precio,
        0,
      ) ?? 0
    );
  });

  readonly subtotalDulceria = computed(() => {
    return (
      this.compra()?.dulceria.reduce(
        (total, item) => total + item.precioUnitario * item.cantidad,
        0,
      ) ?? 0
    );
  });

  readonly total = computed(() => {
    return this.subtotalAsientos() + this.subtotalDulceria();
  });

  guardarReserva(funcion: DetalleFuncion, asientos: Asiento[]): void {
    this.guardar({
      funcion,
      asientos,
      dulceria: [],
    });
  }

  guardarDulceria(dulceria: ItemDulceriaResumen[]): void {
    const compraActual = this.compra();

    if (compraActual) {
      this.guardar({ ...compraActual, dulceria });
      return;
    }

    this.guardar({
      funcion: null,
      asientos: [],
      dulceria,
    });
  }

  limpiar(): void {
    sessionStorage.removeItem(this.claveSesion);
    this.compra.set(null);
  }

  async registrarEnBackend(): Promise<RespuestaCompra> {
    const compraActual = this.compra();

    if (!compraActual) {
      throw new Error("No hay una compra activa");
    }

    const tieneBoletos = compraActual.asientos.length > 0;
    const tieneSnacks = compraActual.dulceria.length > 0;

    if (!tieneBoletos && !tieneSnacks) {
      throw new Error("La compra no contiene boletos ni productos");
    }

    if (tieneBoletos && !compraActual.funcion) {
      throw new Error("No se encontró la función de los boletos");
    }

    if (compraActual.asientos.some((asiento) => !asiento.asientoId)) {
      throw new Error(
        "Recarga el mapa de asientos para obtener los ID de la sala",
      );
    }

    if (compraActual.dulceria.some((item) => !item.id)) {
      throw new Error("Vuelve a escoger los productos de dulcería");
    }

    const solicitud = {
      funcionId: compraActual.funcion
        ? Number(compraActual.funcion.funcionId)
        : null,
      asientoIds: compraActual.asientos.map((asiento) => asiento.asientoId),
      snacks: compraActual.dulceria.map((item) => ({
        id: item.id,
        cantidad: item.cantidad,
      })),
    };

    return firstValueFrom(
      this.http.post<RespuestaCompra>(`${this.apiUrl}/registrar`, solicitud, {
        withCredentials: true,
      }),
    );
  }

  obtenerMisEntradas(): Promise<EntradaUsuario[]> {
    return firstValueFrom(
      this.http.get<EntradaUsuario[]>(`${this.apiUrl}/mias`, {
        withCredentials: true,
      }),
    );
  }

  finalizarCompra(): CompraActiva | null {
    const compraFinalizada = this.compra();
    this.limpiar();
    return compraFinalizada;
  }

  private guardar(compra: CompraActiva): void {
    sessionStorage.setItem(this.claveSesion, JSON.stringify(compra));
    this.compra.set(compra);
  }

  private leerSesion(): CompraActiva | null {
    try {
      const almacenada = sessionStorage.getItem(this.claveSesion);

      return almacenada ? (JSON.parse(almacenada) as CompraActiva) : null;
    } catch {
      sessionStorage.removeItem(this.claveSesion);
      return null;
    }
  }
}
