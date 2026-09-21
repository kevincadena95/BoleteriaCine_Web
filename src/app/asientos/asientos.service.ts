import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, Message } from '@stomp/stompjs';
import { Observable, map } from 'rxjs';

export interface Asiento {
  id: string;
  asientoId: number;
  estado: 'LIBRE' | 'SELECCIONADO' | 'OCUPADO';
  precio: number;
}

@Injectable({ providedIn: 'root' })
export class AsientosService {
  private readonly http = inject(HttpClient);
  private stompClient: Client | null = null;
  private canalLocal: BroadcastChannel | null = null;
  private listenerStorage: ((event: StorageEvent) => void) | null = null;

  // El mapa y los asientos ocupados vienen del backend.
  // En true, la selección temporal entre pestañas continúa siendo local.
  private readonly modoLocal = true;
  private readonly API_URL = 'http://localhost:8080/api/funciones';
  private readonly WS_URL = 'http://localhost:8080/ws';

  obtenerMapaAsientos(funcionId: string): Observable<Asiento[]> {
    const url = `${this.API_URL}/${encodeURIComponent(funcionId)}/asientos`;

    return this.http.get<Asiento[]>(url, { withCredentials: true })
      .pipe(
        map(remotos => {
          if (!this.modoLocal) return remotos;

          const guardados = this.leerMapaLocal(funcionId);
          const mapa = remotos.map(asiento => {
            const estadoLocal = guardados.find(
              item => item.id === asiento.id
            )?.estado;

            return asiento.estado === 'OCUPADO'
              ? asiento
              : { ...asiento, estado: estadoLocal ?? 'LIBRE' };
          });

          localStorage.setItem(
            this.claveLocal(funcionId),
            JSON.stringify(mapa)
          );

          return mapa;
        })
      );
  }

  async conectarWebSocket(
    funcionId: string,
    onUpdate: (asiento: Asiento) => void
  ): Promise<void> {
    if (this.modoLocal) {
      this.conectarCanalLocal(funcionId, onUpdate);
      return;
    }

    // SockJS se importa bajo demanda: Vite no debe evaluarlo mientras corre el modo local.
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
            if (message.body) {
              onUpdate(JSON.parse(message.body) as Asiento);
            }
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
    estado: Asiento['estado']
  ): void {
    if (this.modoLocal) {
      const asientoActual = this.obtenerMapaLocal(funcionId)
        .find(item => item.id === idAsiento);
      if (!asientoActual) return;
      const asiento: Asiento = { ...asientoActual, estado };
      this.guardarActualizacionLocal(funcionId, asiento);
      return;
    }

    if (this.stompClient?.connected) {
      this.stompClient.publish({
        destination: '/app/asiento/seleccionar',
        body: JSON.stringify({ funcionId, idAsiento, estado })
      });
    }
  }

  desconectar(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.canalLocal?.close();
    this.canalLocal = null;
    if (this.listenerStorage) {
      window.removeEventListener('storage', this.listenerStorage);
      this.listenerStorage = null;
    }
  }

  private leerMapaLocal(funcionId: string): Asiento[] {
    try {
      const datos = localStorage.getItem(this.claveLocal(funcionId)) ?? '[]';
      return JSON.parse(datos) as Asiento[];
    } catch {
      return [];
    }
  }

  private obtenerMapaLocal(funcionId: string): Asiento[] {
    return this.leerMapaLocal(funcionId);
  }

  private conectarCanalLocal(
    funcionId: string,
    onUpdate: (asiento: Asiento) => void
  ): void {
    this.canalLocal = new BroadcastChannel(`cine-asientos-${funcionId}`);
    this.canalLocal.onmessage = ({ data }: MessageEvent<Asiento>) => {
      onUpdate(data);
    };
    this.listenerStorage = (event: StorageEvent) => {
      if (event.key === this.claveLocal(funcionId) && event.newValue) {
        const asientos = JSON.parse(event.newValue) as Asiento[];

        for (const asiento of asientos) {
          onUpdate(asiento);
        }
      }
    };
    window.addEventListener('storage', this.listenerStorage);
  }

  private guardarActualizacionLocal(
    funcionId: string,
    actualizado: Asiento
  ): void {
    const mapa = this.obtenerMapaLocal(funcionId).map(asiento =>
      asiento.id === actualizado.id ? actualizado : asiento
    );
    localStorage.setItem(
      this.claveLocal(funcionId),
      JSON.stringify(mapa)
    );
    this.canalLocal?.postMessage(actualizado);
  }

  private claveLocal(funcionId: string): string {
    return `cine:asientos:${funcionId}`;
  }
}
