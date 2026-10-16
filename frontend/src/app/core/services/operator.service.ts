import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { OperatorSession, ActiveSession, StartSessionRequest, Ticket, TransferTicketRequest, TicketActionRequest } from '../models/operator.model';

@Injectable({ providedIn: 'root' })
export class OperatorService {
  private api = inject(ApiService);

  startSession(request: StartSessionRequest): Observable<OperatorSession> {
    return this.api.post<OperatorSession>('/operator/session/start', request);
  }

  endSession(): Observable<OperatorSession> {
    return this.api.post<OperatorSession>('/operator/session/end', {});
  }

  getCurrentSession(): Observable<OperatorSession> {
    return this.api.get<OperatorSession>('/operator/session/current');
  }

  getActiveSessions(): Observable<ActiveSession[]> {
    return this.api.get<ActiveSession[]>('/operator/sessions/active');
  }

  callNext(): Observable<Ticket> {
    return this.api.post<Ticket>('/operator/call-next', {});
  }

  startService(request: TicketActionRequest): Observable<Ticket> {
    return this.api.post<Ticket>('/operator/ticket/start', request);
  }

  completeService(request: TicketActionRequest): Observable<Ticket> {
    return this.api.post<Ticket>('/operator/ticket/complete', request);
  }

  cancelService(request: TicketActionRequest): Observable<Ticket> {
    return this.api.post<Ticket>('/operator/ticket/cancel', request);
  }

  transferTicket(request: TransferTicketRequest): Observable<Ticket & { transfer_info: any }> {
    return this.api.post<Ticket & { transfer_info: any }>('/operator/ticket/transfer', request);
  }

  getCurrentTicket(): Observable<Ticket> {
    return this.api.get<Ticket>('/operator/ticket/current');
  }
}