import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import { Service, Ticket } from '../../core/models/ticket.model';
import { AlertSoundComponent, StatusBadgeComponent } from '../../shared/components';

@Component({
  selector: 'app-kiosk',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AlertSoundComponent, StatusBadgeComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        @if (!validated) {
          <!-- Validating QR -->
          <div class="text-center py-12">
            <div class="inline-block relative">
              <div class="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p class="text-gray-600 mt-4 text-lg">Validando código QR...</p>
          </div>
        } @else if (!qrValid) {
          <!-- Invalid QR -->
          <div class="text-center py-12">
            <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-3">Acceso no válido</h2>
            <p class="text-gray-600 mb-8 max-w-xs mx-auto">
              Debe escanear el código QR proyectado en la sala de atención.
            </p>
            <button
              (click)="retry()"
              class="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Reintentar
            </button>
          </div>
        } @else if (!ticket) {
          <!-- Service Selection -->
          <div class="text-center mb-10">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
            </div>
            <h1 class="text-3xl font-bold text-gray-900">Tomar Turno</h1>
            <p class="text-gray-600 mt-2">Seleccione el trámite que desea realizar</p>
          </div>

          <div class="space-y-3" role="list">
            @for (service of services(); track service.id) {
              <button
                type="button"
                (click)="selectService(service)"
                [disabled]="loading"
                class="w-full text-left p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all duration-200 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                role="listitem"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                      </svg>
                    </div>
                    <div class="text-left">
                      <p class="font-semibold text-gray-900 text-lg">{{ service.name }}</p>
                      <p class="text-sm text-gray-500">{{ service.prefix }} - Trámite {{ service.prefix.replace('TR', '') }}</p>
                    </div>
                  </div>
                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </button>
            }
          </div>

          @if (services().length === 0) {
            <div class="text-center py-12 text-gray-500">
              <p class="text-lg">No hay trámites disponibles en este momento</p>
              <p class="text-sm">Intente más tarde o contacte al personal</p>
            </div>
          }
        } @else {
          <!-- Ticket Issued - Success Screen -->
          @if (ticket()) {
            <div class="text-center animate-fade-in">
              <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 class="text-3xl font-bold text-gray-900 mb-3">¡Turno emitido!</h2>
              <p class="text-gray-600 mb-8">Su número de turno es:</p>
              
              <div class="bg-gray-900 text-white rounded-2xl p-10 mb-8 shadow-lg">
                <p class="text-sm text-gray-400 mb-2 tracking-wide uppercase">NÚMERO DE TURNO</p>
                <p class="text-7xl font-bold font-mono tracking-widest">{{ ticket()!.display_number }}</p>
                <p class="text-lg text-gray-300 mt-4">{{ ticket()!.service_name }}</p>
              </div>

              <div class="bg-gray-50 rounded-xl p-6 mb-8 text-left border border-gray-200">
                <div class="flex items-center justify-between mb-4">
                  <p class="text-sm text-gray-600">Código de seguimiento</p>
                  <button
                    (click)="copyTrackingCode()"
                    class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Copiar
                  </button>
                </div>
                <p class="font-mono text-base text-gray-900 break-all bg-white p-3 rounded-lg border">{{ ticket()!.token }}</p>
                <p class="text-xs text-gray-500 mt-3">Guarde este código para consultar su estado en <a routerLink="/ticket/{{ ticket()!.token }}" class="text-blue-600 hover:underline font-medium">seguimiento</a></p>
              </div>

              <button
                (click)="newTicket()"
                class="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sacar otro turno
              </button>
            </div>
          }
        }
      </div>

      <app-alert-sound [trigger]="soundTrigger()"></app-alert-sound>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.5s ease-out;
    }
  `]
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
  soundTrigger = signal(0);

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
        this.playSound();
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

  copyTrackingCode(): void {
    if (this.ticket()) {
      navigator.clipboard.writeText(this.ticket()!.token).then(() => {
        // Could show a toast here
      });
    }
  }

  playSound(): void {
    this.soundTrigger.update(t => t + 1);
  }
}