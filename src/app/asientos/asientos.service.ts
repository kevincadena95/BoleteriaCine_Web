import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, Message } from '@stomp/stompjs';
import { Observable, of } from 'rxjs';

export interface Asiento {
  id: string;
  estado: 'LIBRE' | 'SELECCIONADO' | 'OCUPADO';
  precio: number;
}

@Injectable({ providedIn: 'root' })
export class AsientosService {
  private http = inject(HttpClient);
  private stompClient: Client | null = null;
  private canalLocal: BroadcastChannel | null = null;
  private listenerStorage: ((event: StorageEvent) => void) | null = null;

  // Déjalo en true para probar el flujo sin backend. Cámbialo a false al integrar Spring Boot.
  private readonly modoLocal = true;
  private readonly API_URL = 'http://localhost:8080/api/funciones';
  private readonly WS_URL = 'http://localhost:8080/ws';

  obtenerMapaAsientos(funcionId: string): Observable<Asiento[]> {
    if (this.modoLocal) {
      return of(this.obtenerMapaLocal(funcionId));
    }

    return this.http.get<Asiento[]>(`${this.API_URL}/${encodeURIComponent(funcionId)}/asientos`);
  }

  async conectarWebSocket(funcionId: string, onUpdate: (asiento: Asiento) => void): Promise<void> {
    if (this.modoLocal) {
      this.conectarCanalLocal(funcionId, onUpdate);
      return;
    }

    // SockJS se importa bajo demanda: Vite no debe evaluarlo mientras corre el modo local.
    // SockJS 1.x espera el alias global que Vite no expone por defecto en el navegador.
    (globalThis as typeof globalThis & { global?: typeof globalThis }).global ??= globalThis;
    const { default: SockJS } = await import('sockjs-client');
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(this.WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        this.stompClient?.subscribe(`/topic/sala/${funcionId}`, (message: Message) => {
          if (message.body) {
            onUpdate(JSON.parse(message.body) as Asiento);
          }
        });
      },
      onStompError: (frame) => console.error('Error STOMP:', frame.headers['message'])
    });
    this.stompClient.activate();
  }

  enviarAccionAsiento(funcionId: string, idAsiento: string, estado: Asiento['estado']): void {
    if (this.modoLocal) {
      const asientoActual = this.obtenerMapaLocal(funcionId).find(item => item.id === idAsiento);
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

  private obtenerMapaLocal(funcionId: string): Asiento[] {
    const clave = this.claveLocal(funcionId);
    const almacenado = localStorage.getItem(clave);
    if (almacenado) return JSON.parse(almacenado) as Asiento[];

    const mapa: Asiento[] = [];
    for (const fila of ['A', 'B', 'C', 'D', 'E']) {
      for (let numero = 1; numero <= 8; numero++) {
        mapa.push({ id: `${fila}${numero}`, estado: 'LIBRE', precio: 6.5 });
      }
    }
    localStorage.setItem(clave, JSON.stringify(mapa));
    return mapa;
  }

  private conectarCanalLocal(funcionId: string, onUpdate: (asiento: Asiento) => void): void {
    this.canalLocal = new BroadcastChannel(`cine-asientos-${funcionId}`);
    this.canalLocal.onmessage = ({ data }: MessageEvent<Asiento>) => onUpdate(data);
    this.listenerStorage = (event: StorageEvent) => {
      if (event.key === this.claveLocal(funcionId) && event.newValue) {
        for (const asiento of JSON.parse(event.newValue) as Asiento[]) onUpdate(asiento);
      }
    };
    window.addEventListener('storage', this.listenerStorage);
  }

  private guardarActualizacionLocal(funcionId: string, actualizado: Asiento): void {
    const mapa = this.obtenerMapaLocal(funcionId).map(asiento =>
      asiento.id === actualizado.id ? actualizado : asiento
    );
    localStorage.setItem(this.claveLocal(funcionId), JSON.stringify(mapa));
    this.canalLocal?.postMessage(actualizado);
  }

  private claveLocal(funcionId: string): string {
    return `cine:asientos:${funcionId}`;
  }
}
