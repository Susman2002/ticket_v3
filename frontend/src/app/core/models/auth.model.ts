export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator';
  role_id?: number;
  active?: boolean;
  created_at?: string;
  role_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface Role {
  id: number;
  name: string;
}