import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Service, Window, Ticket, CreateTicketRequest, QueueSummary, QRCurrent } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private api = inject(ApiService);

  getQRCurrent(): Observable<QRCurrent> {
    return this.api.get<QRCurrent>('/qr/current');
  }

  validateQR(token: string): Observable<{ valid: boolean }> {
    return this.api.get<{ valid: boolean }>(`/qr/validate/${token}`);
  }

  getServices(): Observable<Service[]> {
    return this.api.get<Service[]>('/services');
  }

  createTicket(request: CreateTicketRequest): Observable<Ticket> {
    return this.api.post<Ticket>('/tickets', request);
  }

  getTicket(token: string): Observable<Ticket> {
    return this.api.get<Ticket>(`/tickets/${token}`);
  }

  getQueue(serviceId: number): Observable<Ticket[]> {
    return this.api.get<Ticket[]>(`/queue/${serviceId}`);
  }

  getQueueSummary(): Observable<QueueSummary[]> {
    return this.api.get<QueueSummary[]>('/queue');
  }

  getWindows(): Observable<Window[]> {
    return this.api.get<Window[]>('/windows');
  }
}