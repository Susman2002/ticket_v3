export interface Service {
  id: number;
  name: string;
  prefix: string;
  active: boolean;
  created_at: string;
}

export interface Window {
  id: number;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  service_id: number;
  number: number;
  display_number: string;
  token: string;
  status: 'waiting' | 'called' | 'in_service' | 'completed' | 'cancelled' | 'transferred';
  window_id: number | null;
  operator_session_id: number | null;
  qr_token: string;
  created_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  transferred_at: string | null;
  service_name?: string;
  prefix?: string;
  window_name?: string;
}

export interface CreateTicketRequest {
  service_id: number;
  qr_token: string;
}

export interface QueueSummary {
  service_id: number;
  name: string;
  prefix: string;
  waiting_count: string;
  called_count: string;
  in_service_count: string;
}

export interface QRCurrent {
  token: string;
  remainingSeconds: number;
  expiresAt: number;
}