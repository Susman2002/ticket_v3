import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Subject, Observable } from 'rxjs';
import { WSEvent } from '../models/websocket.model';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000;
  private shouldReconnect = true;

  // Subjects para cada evento
  private qrRotated$ = new Subject<WSEvent<any>>();
  private ticketCreated$ = new Subject<WSEvent<any>>();
  private ticketCalled$ = new Subject<WSEvent<any>>();
  private ticketUpdated$ = new Subject<WSEvent<any>>();
  private ticketTransferred$ = new Subject<WSEvent<any>>();
  private operatorSessionStarted$ = new Subject<WSEvent<any>>();
  private operatorSessionEnded$ = new Subject<WSEvent<any>>();

  // Observables públicos
  onQRRotated = this.qrRotated$.asObservable();
  onTicketCreated = this.ticketCreated$.asObservable();
  onTicketCalled = this.ticketCalled$.asObservable();
  onTicketUpdated = this.ticketUpdated$.asObservable();
  onTicketTransferred = this.ticketTransferred$.asObservable();
  onOperatorSessionStarted = this.operatorSessionStarted$.asObservable();
  onOperatorSessionEnded = this.operatorSessionEnded$.asObservable();

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.shouldReconnect = true;
    this.ws = new WebSocket(environment.wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket conectado');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSEvent = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error('Error parseando mensaje WS:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket desconectado');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('Error WebSocket:', error);
    };
  }

  private handleMessage(message: WSEvent): void {
    switch (message.event) {
      case 'QR_ROTATED':
        this.qrRotated$.next(message);
        break;
      case 'ticket_created':
        this.ticketCreated$.next(message);
        break;
      case 'ticket_called':
        this.ticketCalled$.next(message);
        break;
      case 'ticket_updated':
        this.ticketUpdated$.next(message);
        break;
      case 'ticket_transferred':
        this.ticketTransferred$.next(message);
        break;
      case 'operator_session_started':
        this.operatorSessionStarted$.next(message);
        break;
      case 'operator_session_ended':
        this.operatorSessionEnded$.next(message);
        break;
    }
  }

  private attemptReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reintentando conexión... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(() => this.connect(), this.reconnectDelay);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}