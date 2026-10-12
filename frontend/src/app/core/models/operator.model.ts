import { Ticket } from './ticket.model';

export interface OperatorSession {
  id: number;
  user_id: number;
  window_id: number;
  service_id: number;
  started_at: string;
  ended_at: string | null;
  active: boolean;
  window_name?: string;
  service_name?: string;
  service_prefix?: string;
}

export interface StartSessionRequest {
  window_id: number;
  service_id: number;
}

export interface TransferTicketRequest {
  ticket_id: number;
  target_window_id: number;
}

export interface TicketActionRequest {
  ticket_id: number;
}

// Re-export for convenience
export type { Ticket };