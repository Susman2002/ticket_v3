export interface WSEvent<T = any> {
  event: string;
  data: T;
}

export interface QRRotatedData {
  token: string;
  remainingSeconds: number;
  expiresAt: number;
}

export interface TicketCreatedData {
  id: number;
  display_number: string;
  service_id: number;
  status: string;
}

export interface TicketCalledData {
  id: number;
  display_number: string;
  service_id: number;
  window_id: number;
  operator_session_id: number;
  window_name: string;
  service_name: string;
}

export interface TicketUpdatedData {
  id: number;
  display_number: string;
  status: string;
  window_id: number | null;
  window_name: string | null;
}

export interface TicketTransferredData {
  ticket: {
    id: number;
    display_number: string;
    status: string;
    window_id: number;
    window_name: string;
  };
  transfer_info: {
    from_window_id: number;
    from_operator_session_id: number;
    to_window_id: number;
    to_operator_session_id: number;
    to_operator_user_id: number;
  };
}

export interface OperatorSessionStartedData {
  session: OperatorSession;
  operator: string;
}

export interface OperatorSessionEndedData {
  sessionId: number;
  operator: string;
}

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