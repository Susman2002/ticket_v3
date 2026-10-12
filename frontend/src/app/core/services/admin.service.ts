import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Service, Window, CreateServiceRequest, UpdateServiceRequest, CreateWindowRequest, UpdateWindowRequest } from '../models/admin.model';

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
}