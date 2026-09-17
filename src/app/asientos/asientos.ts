import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Asiento, AsientosService } from './asientos.service';
import { CompraService } from '../compra/compra.service';

@Component({
  selector: 'app-asientos',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './asientos.html',
  styleUrls: ['./asientos.css']
})
export class Asientos implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private asientosService = inject(AsientosService);
  private compraService = inject(CompraService);
  private intervaloReserva: ReturnType<typeof setInterval> | null = null;
  private resolverSalida: ((puedeSalir: boolean) => void) | null = null;
  private permitirSalida = false;

  funcionId = signal('');
  cargando = signal(true);
  asientos = signal<Asiento[]>([]);
  pelicula = signal('Película seleccionada');
  peliculaSlug = signal('');
  fecha = signal('');
  formato = signal('');
  sala = signal('');
  hora = signal('');
  aviso = signal('');
  mostrarConfirmacion = signal(false);
  tiempoRestante = signal(5 * 60);

  seleccionados = computed(() => this.asientos().filter(asiento => asiento.estado === 'SELECCIONADO'));
  subtotal = computed(() => this.seleccionados().reduce((total, asiento) => total + asiento.precio, 0));
  puedeContinuar = computed(() => this.seleccionados().length > 0);
  tiempoFormateado = computed(() => {
    const minutos = Math.floor(this.tiempoRestante() / 60).toString().padStart(2, '0');
    const segundos = (this.tiempoRestante() % 60).toString().padStart(2, '0');
    return `${minutos}:${segundos}`;
  });
  filas = computed(() => {
    const porFila = new Map<string, Asiento[]>();
    for (const asiento of this.asientos()) {
      const fila = asiento.id.charAt(0);
      porFila.set(fila, [...(porFila.get(fila) ?? []), asiento]);
    }
    return [...porFila.entries()].map(([nombre, asientos]) => ({ nombre, asientos }));
  });

  ngOnInit(): void {
    const idFuncion = this.route.snapshot.paramMap.get('funcionId');
    if (!idFuncion) {
      this.router.navigate(['/cartelera']);
      return;
    }

    this.funcionId.set(idFuncion);
    const query = this.route.snapshot.queryParamMap;
    this.peliculaSlug.set(query.get('slug') ?? 'cartelera');
    this.pelicula.set(query.get('pelicula') ?? this.pelicula());
    this.fecha.set(query.get('fecha') ?? '');
    this.formato.set(query.get('formato') ?? '');
    this.sala.set(query.get('sala') ?? '');
    this.hora.set(query.get('hora') ?? '');
    this.cargarAsientos();
    this.conectarWS();
  }

  ngOnDestroy(): void {
    this.detenerTemporizador();
    this.asientosService.desconectar();
  }

  // El navegador muestra su alerta nativa al recargar o cerrar una pestaña.
  // El backend debe expirar cualquier bloqueo que no reciba confirmación de compra.
  @HostListener('window:beforeunload', ['$event'])
  advertirAntesDeCerrar(event: BeforeUnloadEvent): void {
    if (!this.puedeContinuar()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  confirmarAbandono(): boolean | Promise<boolean> {
    if (this.permitirSalida || !this.puedeContinuar()) return true;
    this.mostrarConfirmacion.set(true);
    return new Promise<boolean>(resolve => this.resolverSalida = resolve);
  }

  cancelarSalida(): void {
    this.mostrarConfirmacion.set(false);
    this.resolverSalida?.(false);
    this.resolverSalida = null;
  }

  confirmarSalida(): void {
    this.liberarSeleccion('Selección cancelada. Los asientos fueron liberados.');
    this.permitirSalida = true;
    this.mostrarConfirmacion.set(false);
    this.resolverSalida?.(true);
    this.resolverSalida = null;
  }

  toggleAsiento(asiento: Asiento): void {
    if (asiento.estado === 'OCUPADO') return;
    const nuevoEstado: Asiento['estado'] = asiento.estado === 'LIBRE' ? 'SELECCIONADO' : 'LIBRE';
    this.asientos.update(actuales => actuales.map(item => item.id === asiento.id ? { ...item, estado: nuevoEstado } : item));
    this.asientosService.enviarAccionAsiento(this.funcionId(), asiento.id, nuevoEstado);

    if (nuevoEstado === 'SELECCIONADO') {
      this.iniciarTemporizador();
      this.mostrarAviso(`Asiento ${asiento.id} agregado a tu selección.`);
    } else {
      this.mostrarAviso(`Asiento ${asiento.id} retirado de tu selección.`);
      if (!this.puedeContinuar()) this.detenerTemporizador();
    }
  }

  cancelarSeleccion(): void {
    this.liberarSeleccion('Tu selección fue cancelada.');
  }

  continuar(incluirDulceria: boolean): void {
    this.compraService.guardarReserva({
      funcionId: this.funcionId(),
      pelicula: this.pelicula(),
      fecha: this.fecha(),
      hora: this.hora(),
      formato: this.formato(),
      sala: this.sala()
    }, this.seleccionados());
    this.permitirSalida = true;
    this.router.navigate([incluirDulceria ? '/dulceria' : '/confirmacion']);
  }

  private cargarAsientos(): void {
    this.cargando.set(true);
    this.asientosService.obtenerMapaAsientos(this.funcionId()).subscribe({
      next: asientos => {
        this.asientos.set(asientos);
        this.cargando.set(false);
      },
      error: error => {
        console.error('No se pudo cargar el mapa de asientos:', error);
        this.asientos.set([]);
        this.cargando.set(false);
      }
    });
  }

  private conectarWS(): void {
    this.asientosService.conectarWebSocket(this.funcionId(), asientoWS => {
      // El backend emite el estado definitivo; el precio local se conserva si el mensaje no lo trae.
      this.asientos.update(actuales => actuales.map(item => item.id === asientoWS.id ? { ...item, ...asientoWS } : item));
    });
  }

  private iniciarTemporizador(): void {
    if (this.intervaloReserva) return;
    this.tiempoRestante.set(5 * 60);
    this.intervaloReserva = setInterval(() => {
      const restante = this.tiempoRestante() - 1;
      this.tiempoRestante.set(restante);
      if (restante <= 0) this.liberarSeleccion('Tu reserva temporal venció; los asientos fueron liberados.');
    }, 1000);
  }

  private detenerTemporizador(): void {
    if (this.intervaloReserva) clearInterval(this.intervaloReserva);
    this.intervaloReserva = null;
    this.tiempoRestante.set(5 * 60);
  }

  private liberarSeleccion(mensaje: string): void {
    const ids = this.seleccionados().map(asiento => asiento.id);
    this.asientos.update(actuales => actuales.map(asiento =>
      ids.includes(asiento.id) ? { ...asiento, estado: 'LIBRE' } : asiento
    ));
    for (const id of ids) this.asientosService.enviarAccionAsiento(this.funcionId(), id, 'LIBRE');
    this.detenerTemporizador();
    this.mostrarAviso(mensaje);
  }

  private mostrarAviso(mensaje: string): void {
    this.aviso.set(mensaje);
    setTimeout(() => this.aviso.set(''), 3000);
  }
}
