import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Service, Window } from '../models/ticket.model';
import { CreateServiceRequest, UpdateServiceRequest, CreateWindowRequest, UpdateWindowRequest, CreateUserRequest, UpdateUserRequest } from '../models/admin.model';
import { User, Role } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = inject(ApiService);

  // Servicios
  getServices(): Observable<Service[]> {
    return this.api.get<Service[]>('/services');
  }

  createService(request: CreateServiceRequest): Observable<Service> {
    return this.api.post<Service>('/services', request);
  }

  updateService(id: number, request: UpdateServiceRequest): Observable<Service> {
    return this.api.put<Service>(`/services/${id}`, request);
  }

  deleteService(id: number): Observable<Service> {
    return this.api.delete<Service>(`/services/${id}`);
  }

  // Ventanillas
  getWindows(): Observable<Window[]> {
    return this.api.get<Window[]>('/windows');
  }

  createWindow(request: CreateWindowRequest): Observable<Window> {
    return this.api.post<Window>('/windows', request);
  }

  updateWindow(id: number, request: UpdateWindowRequest): Observable<Window> {
    return this.api.put<Window>(`/windows/${id}`, request);
  }

  deleteWindow(id: number): Observable<Window> {
    return this.api.delete<Window>(`/windows/${id}`);
  }

  // Usuarios
  getUsers(): Observable<User[]> {
    return this.api.get<User[]>('/users');
  }

  getRoles(): Observable<Role[]> {
    return this.api.get<Role[]>('/users/roles');
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.api.post<User>('/users', request);
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<User> {
    return this.api.put<User>(`/users/${id}`, request);
  }

  updateUserPassword(id: number, password: string): Observable<User> {
    return this.api.put<User>(`/users/${id}/password`, { password });
  }

  deleteUser(id: number): Observable<User> {
    return this.api.delete<User>(`/users/${id}`);
  }
}