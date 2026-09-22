import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, Message } from '@stomp/stompjs';
import { Observable, map } from 'rxjs';

export interface Asiento {
  id: string;
  asientoId: number;
  estado: 'LIBRE' | 'SELECCIONADO' | 'RESERVADO' | 'OCUPADO';
  precio: number;
  clienteId?: string | null;
}

interface EventoAsientoWS {
  id: string;
  estado: 'LIBRE' | 'RESERVADO' | 'OCUPADO';
  clienteId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AsientosService {
  private readonly http = inject(HttpClient);
  private stompClient: Client | null = null;

  private readonly API_URL = 'http://192.168.137.1:8080/api/funciones';
  private readonly WS_URL = 'http://192.168.137.1:8080/ws';
  private readonly clienteId = this.obtenerOCrearClienteId();

  obtenerMapaAsientos(funcionId: string): Observable<Asiento[]> {
    const url = `${this.API_URL}/${encodeURIComponent(funcionId)}/asientos`;

    return this.http.get<Asiento[]>(url, { withCredentials: true })
      .pipe(
        map(remotos => remotos.map(asiento => ({
          ...asiento,
          estado: this.traducirEstado(asiento.estado, asiento.clienteId)
        })))
      );
  }

  async conectarWebSocket(
    funcionId: string,
    onUpdate: (asiento: { id: string; estado: Asiento['estado'] }) => void
  ): Promise<void> {
    // SockJS se importa bajo demanda: Vite no debe evaluarlo hasta que realmente se conecte.
    // SockJS 1.x espera el alias global que Vite no expone por defecto en el navegador.
    (globalThis as typeof globalThis & {
      global?: typeof globalThis;
    }).global ??= globalThis;
    const { default: SockJS } = await import('sockjs-client');
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(this.WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        this.stompClient?.subscribe(
          `/topic/sala/${funcionId}`,
          (message: Message) => {
            if (!message.body) return;
            const evento = JSON.parse(message.body) as EventoAsientoWS;
            onUpdate({
              id: evento.id,
              estado: this.traducirEstado(evento.estado, evento.clienteId)
            });
          }
        );
      },
      onStompError: frame => {
        console.error('Error STOMP:', frame.headers['message']);
      }
    });
    this.stompClient.activate();
  }

  enviarAccionAsiento(
    funcionId: string,
    idAsiento: string,
    estado: 'SELECCIONADO' | 'LIBRE'
  ): void {
    if (!this.stompClient?.connected) return;

    this.stompClient.publish({
      destination: '/app/asiento/seleccionar',
      body: JSON.stringify({
        funcionId,
        idAsiento,
        estado,
        clienteId: this.clienteId
      })
    });
  }

  desconectar(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
  }

  // El backend nunca envía "SELECCIONADO": manda RESERVADO junto con el clienteId
  // de quien lo tomó. Si coincide con el propio, es mi selección; si no, queda
  // bloqueado para mí como RESERVADO por otro usuario.
  private traducirEstado(
    estado: Asiento['estado'],
    clienteId: string | null | undefined
  ): Asiento['estado'] {
    return estado === 'RESERVADO' && clienteId === this.clienteId
      ? 'SELECCIONADO'
      : estado;
  }

  private obtenerOCrearClienteId(): string {
    const clave = 'cine:clienteId';
    let clienteId = sessionStorage.getItem(clave);
    if (!clienteId) {
      // crypto.randomUUID() solo existe en contextos seguros (https o localhost);
      // la app corre por http sobre la IP de la red local, así que no está disponible.
      clienteId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(clave, clienteId);
    }
    return clienteId;
  }
}
