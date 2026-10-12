import { Service, Window } from './ticket.model';

export interface CreateServiceRequest {
  name: string;
  prefix: string;
}

export interface UpdateServiceRequest {
  name?: string;
  prefix?: string;
  active?: boolean;
}

export interface CreateWindowRequest {
  name: string;
}

export interface UpdateWindowRequest {
  name?: string;
  active?: boolean;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role_id: number;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role_id?: number;
  active?: boolean;
}

// Re-export for convenience
export type { Service, Window };