import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../core/services/ticket.service';
import { Service, Ticket } from '../../core/models/ticket.model';

@Component({
  selector: 'app-kiosk',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        @if (!validated) {
          <!-- Validating QR -->
          <div class="text-center py-8">
            <svg class="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-600">Validando código QR...</p>
          </div>
        } @else if (!qrValid) {
          <!-- Invalid QR -->
          <div class="text-center py-8">
            <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">Acceso no válido</h2>
            <p class="text-gray-600 mb-6">Debe escanear el código QR proyectado en la sala de atención.</p>
            <button
              (click)="retry()"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        } @else if (!ticket) {
          <!-- Service Selection -->
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900">Tomar Turno</h1>
            <p class="text-gray-600 mt-1">Seleccione el trámite que desea realizar</p>
          </div>

          <div class="space-y-3" role="list">
            @for (service of services(); track service.id) {
              <button
                type="button"
                (click)="selectService(service)"
                [disabled]="loading"
                class="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                role="listitem"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-gray-900">{{ service.name }}</p>
                    <p class="text-sm text-gray-500">{{ service.prefix }} - Trámite {{ service.prefix.replace('TR', '') }}</p>
                  </div>
                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </button>
            }
          </div>

          @if (services().length === 0) {
            <div class="text-center py-8 text-gray-500">
              <p>No hay trámites disponibles en este momento</p>
            </div>
          }
        } @else {
          <!-- Ticket Issued -->
          <div class="text-center">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">¡Turno emitido!</h2>
            <p class="text-gray-600 mb-6">Su número de turno es:</p>
            
            <div class="bg-gray-900 text-white rounded-xl p-8 mb-6">
              <p class="text-sm text-gray-400 mb-1">NÚMERO DE TURNO</p>
              <p class="text-5xl font-bold font-mono tracking-wider">{{ ticket()?.display_number }}</p>
              <p class="text-sm text-gray-400 mt-2">{{ ticket()?.service_name }}</p>
            </div>

            <div class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p class="text-sm text-gray-600 mb-1">Código de seguimiento:</p>
              <p class="font-mono text-sm text-gray-900 break-all">{{ ticket()?.token }}</p>
              <p class="text-xs text-gray-500 mt-2">Guarde este código para consultar su estado en <a href="#" class="text-blue-600 hover:underline">seguimiento</a></p>
            </div>

            <button
              (click)="newTicket()"
              class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sacar otro turno
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: []
})
export class KioskComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);

  validated = false;
  qrValid = false;
  loading = false;
  services = signal<Service[]>([]);
  ticket = signal<Ticket | null>(null);
  selectedServiceId: number | null = null;
  qrToken = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.qrToken = params.get('token') || '';
      this.validateQR();
    });
    this.loadServices();
  }

  validateQR(): void {
    if (!this.qrToken) {
      this.validated = true;
      this.qrValid = false;
      return;
    }

    this.ticketService.validateQR(this.qrToken).subscribe({
      next: (res) => {
        this.validated = true;
        this.qrValid = res.valid;
      },
      error: () => {
        this.validated = true;
        this.qrValid = false;
      }
    });
  }

  loadServices(): void {
    this.ticketService.getServices().subscribe({
      next: (services) => this.services.set(services.filter(s => s.active)),
      error: () => this.services.set([])
    });
  }

  selectService(service: Service): void {
    this.selectedServiceId = service.id;
    this.loading = true;

    this.ticketService.createTicket({ service_id: service.id, qr_token: this.qrToken }).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        alert(err.error?.error || 'Error al emitir turno');
      }
    });
  }

  newTicket(): void {
    this.ticket.set(null);
    this.selectedServiceId = null;
  }

  retry(): void {
    this.validated = false;
    this.qrValid = false;
    this.validateQR();
  }
}