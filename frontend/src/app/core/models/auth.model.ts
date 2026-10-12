export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}